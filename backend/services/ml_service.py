"""ML Prediction Service - wraps existing ML components"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any
import time
import math

from .feature_engineering import engineer_dataset, normalize_features, extract_features
from .models import MLEnsemble, TimeSeriesModels, evaluate_model
from .backtesting import Backtester
from utils.logger import logger


def sanitize_value(value):
    """Convert NaN and Inf values to None for JSON serialization"""
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    elif isinstance(value, dict):
        return {k: sanitize_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [sanitize_value(item) for item in value]
    return value


class MLService:
    """Service for ML-based stock price predictions"""

    def fetch_stock_data_with_retry(self, symbol: str, start_date: datetime, end_date: datetime, max_retries: int = 3) -> pd.DataFrame:
        """Fetch stock data with retry logic"""
        for attempt in range(max_retries):
            try:
                ticker = yf.Ticker(symbol)
                df = ticker.history(period='2y', interval='1d')

                if df.empty:
                    df = ticker.history(start=start_date, end=end_date)

                if not df.empty:
                    return df

                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    logger.warn(f"No data received for {symbol}, retrying in {wait_time}s", {
                        "attempt": attempt + 1,
                        "max_retries": max_retries
                    })
                    time.sleep(wait_time)
                else:
                    raise ValueError(f"No data available for {symbol}")

            except Exception as e:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    logger.warn(f"Error fetching {symbol}, retrying in {wait_time}s", {
                        "error": str(e),
                        "attempt": attempt + 1
                    })
                    time.sleep(wait_time)
                else:
                    raise ValueError(f"Failed to fetch data for {symbol}: {str(e)}")

        raise ValueError(f"Failed to fetch data for {symbol} after {max_retries} attempts")

    async def generate_predictions(self, symbol: str) -> Dict[str, Any]:
        """
        Generate ML predictions for a stock symbol

        Returns comprehensive prediction data including:
        - Price predictions for multiple timeframes
        - Model performance metrics
        - Feature importance
        - Backtesting results
        """
        try:
            logger.info(f"Starting ML prediction for {symbol}")

            # Fetch historical data (2 years)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=730)

            df = self.fetch_stock_data_with_retry(symbol, start_date, end_date)

            if df.empty or len(df) < 250:
                raise ValueError(f"Insufficient data for {symbol}. Need at least 250 days, got {len(df)}")

            # Prepare data
            df = df.reset_index()
            df.columns = [col.lower() for col in df.columns]
            df = df.rename(columns={'date': 'date'})
            df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

            logger.info(f"Fetched {len(df)} data points for {symbol}")

            # Engineer features
            logger.info("Engineering features...")
            features_df, y, dates, prices = engineer_dataset(df)

            # Get feature names
            feature_names = list(features_df.columns)

            # Normalize features
            X, feature_scaler, target_scaler = normalize_features(features_df)

            current_price = float(df['close'].iloc[-1])
            logger.info(f"Current price for {symbol}: ${current_price:.2f}")

            # Train models
            logger.info("Training ML ensemble...")
            ensemble = MLEnsemble()
            time_series_models = TimeSeriesModels()

            # Train ensemble
            ensemble.train(X, y)

            # Extract and normalize features for latest prediction
            latest_features_dict = extract_features(df)

            # Convert to DataFrame with same columns as training data
            latest_features_df = pd.DataFrame([latest_features_dict])[feature_names]

            # Normalize using training statistics
            normalized_latest = (latest_features_df - pd.Series(feature_scaler)) / pd.Series(target_scaler)

            # Get ensemble prediction (returns predicted return, not price)
            ensemble_pred_return = ensemble.predict(normalized_latest)[0]

            # Train and predict
            predictions = {}
            model_performances = {}

            # Time series predictions
            prices = pd.Series(df['close'].values)
            time_series_models.train(prices)

            # Get predictions for different timeframes
            ts_next_day = time_series_models.predict(steps=1)
            ts_next_week = time_series_models.predict(steps=5)
            ts_next_month = time_series_models.predict(steps=21)

            ts_predictions = {
                'next_day': ts_next_day['ensemble'],
                'next_week': ts_next_week['ensemble'],
                'next_month': ts_next_month['ensemble']
            }

            # Calculate historical volatility for realistic bounds
            returns = df['close'].pct_change().dropna()
            daily_vol = returns.std()  # Daily volatility

            # Clip ML ensemble prediction to realistic range (±2 standard deviations)
            # For most stocks, 2-sigma daily move is rare but possible
            max_realistic_return = 2.5 * daily_vol
            min_realistic_return = -2.5 * daily_vol

            # Clip the ensemble prediction
            ensemble_pred_return_clipped = np.clip(
                ensemble_pred_return,
                min_realistic_return,
                max_realistic_return
            )

            logger.info(f"ML predicted return: {ensemble_pred_return:.4f}, clipped to: {ensemble_pred_return_clipped:.4f}")
            logger.info(f"Daily volatility: {daily_vol:.4f}, max realistic move: ±{max_realistic_return:.4f}")

            # Combine predictions with conservative weighting
            # ML ensemble predicts 1-day return, convert to price
            next_day_price_ml = current_price * (1 + ensemble_pred_return_clipped)
            next_day_price_ts = ts_predictions.get('next_day', current_price)

            # Cap time series prediction to similar realistic bounds
            ts_return = (next_day_price_ts - current_price) / current_price
            ts_return_clipped = np.clip(ts_return, min_realistic_return, max_realistic_return)
            next_day_price_ts_clipped = current_price * (1 + ts_return_clipped)

            # Weighted average: favor ML model but blend with time series
            next_day_price = (next_day_price_ml * 0.6 + next_day_price_ts_clipped * 0.4)

            # Add mean reversion component - if prediction is extreme, pull it back
            # Calculate recent average price (20-day SMA)
            sma_20 = df['close'].tail(20).mean()
            deviation_from_mean = (next_day_price - sma_20) / sma_20

            # If prediction deviates more than 2% from 20-day average, apply gentle mean reversion
            if abs(deviation_from_mean) > 0.02:
                mean_reversion_weight = min(abs(deviation_from_mean) * 2, 0.15)  # Max 15% weight
                next_day_price = next_day_price * (1 - mean_reversion_weight) + sma_20 * mean_reversion_weight
                logger.info(f"Applied mean reversion: deviation {deviation_from_mean:.2%}, weight {mean_reversion_weight:.2%}")

            # Use time series models for longer timeframes with realistic bounds
            # For weekly: allow up to 3.5 sigma (5 trading days)
            max_week_return = 3.5 * daily_vol * np.sqrt(5)
            min_week_return = -3.5 * daily_vol * np.sqrt(5)

            next_week_price_raw = ts_predictions.get('next_week', current_price)
            week_return = (next_week_price_raw - current_price) / current_price
            week_return_clipped = np.clip(week_return, min_week_return, max_week_return)
            next_week_price = current_price * (1 + week_return_clipped)

            # For monthly: allow up to 4 sigma (21 trading days)
            max_month_return = 4.0 * daily_vol * np.sqrt(21)
            min_month_return = -4.0 * daily_vol * np.sqrt(21)

            next_month_price_raw = ts_predictions.get('next_month', current_price)
            month_return = (next_month_price_raw - current_price) / current_price
            month_return_clipped = np.clip(month_return, min_month_return, max_month_return)
            next_month_price = current_price * (1 + month_return_clipped)

            # Calculate realistic confidence intervals based on volatility
            # Using 1.5 standard deviations for ~86% confidence interval
            day_lower = current_price * (1 + ((next_day_price - current_price) / current_price) - 1.5 * daily_vol)
            day_upper = current_price * (1 + ((next_day_price - current_price) / current_price) + 1.5 * daily_vol)

            week_vol = daily_vol * np.sqrt(5)
            week_lower = current_price * (1 + ((next_week_price - current_price) / current_price) - 1.5 * week_vol)
            week_upper = current_price * (1 + ((next_week_price - current_price) / current_price) + 1.5 * week_vol)

            month_vol = daily_vol * np.sqrt(21)
            month_lower = current_price * (1 + ((next_month_price - current_price) / current_price) - 1.5 * month_vol)
            month_upper = current_price * (1 + ((next_month_price - current_price) / current_price) + 1.5 * month_vol)

            predictions = {
                "nextDay": {
                    "predictedPrice": float(next_day_price),
                    "predictedReturn": float(((next_day_price / current_price) - 1) * 100),
                    "confidence": 0.70,  # More conservative confidence
                    "lowerBound": float(max(day_lower, current_price * 0.97)),  # Floor at -3%
                    "upperBound": float(min(day_upper, current_price * 1.03))   # Cap at +3%
                },
                "nextWeek": {
                    "predictedPrice": float(next_week_price),
                    "predictedReturn": float(((next_week_price / current_price) - 1) * 100),
                    "confidence": 0.60,  # Lower confidence for longer horizon
                    "lowerBound": float(max(week_lower, current_price * 0.94)),  # Floor at -6%
                    "upperBound": float(min(week_upper, current_price * 1.06))   # Cap at +6%
                },
                "nextMonth": {
                    "predictedPrice": float(next_month_price),
                    "predictedReturn": float(((next_month_price / current_price) - 1) * 100),
                    "confidence": 0.50,  # Even lower confidence for monthly
                    "lowerBound": float(max(month_lower, current_price * 0.88)),  # Floor at -12%
                    "upperBound": float(min(month_upper, current_price * 1.12))   # Cap at +12%
                }
            }

            # Model performances
            models_dict = {
                'linear': ensemble.linear_model,
                'lasso': ensemble.lasso_model,
                'random_forest': ensemble.rf_model,
                'gradient_boosting': ensemble.gb_model
            }
            for model_name, model in models_dict.items():
                try:
                    y_pred = model.predict(X)
                    perf = evaluate_model(y, y_pred)
                    model_performances[model_name] = perf
                except:
                    pass

            # Feature importance
            feature_importance = []
            if hasattr(ensemble.rf_model, 'feature_importances_'):
                importances = ensemble.rf_model.feature_importances_
                for feat, imp in zip(feature_names, importances):
                    feature_importance.append({"feature": feat, "importance": float(imp)})
                feature_importance.sort(key=lambda x: x['importance'], reverse=True)
                feature_importance = feature_importance[:10]  # Top 10

            # Generate recommendation with more conservative thresholds
            # Weight short-term prediction more heavily
            avg_return = (predictions['nextDay']['predictedReturn'] * 0.6 +
                         predictions['nextWeek']['predictedReturn'] * 0.4)

            # Consider volatility in recommendation - higher vol means more caution
            risk_adjusted_return = avg_return / (daily_vol * 100)  # Return per unit of volatility

            if avg_return > 2.0 and risk_adjusted_return > 0.5:
                recommendation = "STRONG_BUY"
                analysis = f"Strong upward trend with {avg_return:.1f}% expected return. Model confidence: {predictions['nextDay']['confidence']*100:.0f}%"
            elif avg_return > 0.8:
                recommendation = "BUY"
                analysis = f"Positive momentum with {avg_return:.1f}% expected return. Consider entry point based on technical levels"
            elif avg_return > -0.8:
                recommendation = "HOLD"
                analysis = f"Neutral outlook with {avg_return:.1f}% expected return. Wait for clearer signals"
            elif avg_return > -2.0:
                recommendation = "SELL"
                analysis = f"Weakness detected with {avg_return:.1f}% expected decline. Consider reducing exposure"
            else:
                recommendation = "STRONG_SELL"
                analysis = f"Strong downward pressure with {avg_return:.1f}% expected decline. Risk management suggested"

            # Backtesting
            logger.info("Running backtest...")
            backtester = Backtester(initial_capital=10000)
            backtest_results = backtester.run_backtest(ensemble, X, y, dates)

            # Transform backtest results to match frontend expectations (flatten and convert to camelCase)
            backtest_metrics = backtest_results.get('metrics', {})
            backtest_transformed = {
                "totalReturns": backtest_metrics.get('total_return', 0),
                "annualizedReturns": backtest_metrics.get('annualized_return', 0),
                "sharpeRatio": backtest_metrics.get('sharpe_ratio', 0),
                "maxDrawdown": backtest_metrics.get('max_drawdown', 0),
                "winRate": backtest_metrics.get('win_rate', 0),
                "profitFactor": backtest_metrics.get('profit_factor', 0),
                "trades": backtest_results.get('trades', []),
                "numTrades": backtest_metrics.get('num_trades', 0),
                "numWins": backtest_metrics.get('num_wins', 0),
                "numLosses": backtest_metrics.get('num_losses', 0)
            }

            logger.info(f"ML prediction completed for {symbol}")

            result = {
                "predictions": {
                    "symbol": symbol,
                    "currentPrice": current_price,
                    "predictions": predictions,
                    "modelPerformances": model_performances,
                    "featureImportance": feature_importance,
                    "confidence": 0.70,
                    "recommendation": recommendation,
                    "analysis": analysis
                },
                "backtest": backtest_transformed,
                "dataPoints": len(df),
                "lastUpdate": datetime.now().isoformat()
            }

            # Sanitize all values to remove NaN/Inf
            return sanitize_value(result)

        except Exception as e:
            logger.error(f"ML prediction failed for {symbol}", e)
            raise
