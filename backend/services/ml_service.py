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

            # Combine predictions
            # ML ensemble predicts 1-day return, convert to price
            next_day_price_ml = current_price * (1 + ensemble_pred_return)
            next_day_price_ts = ts_predictions.get('next_day', current_price)
            next_day_price = (next_day_price_ml + next_day_price_ts) / 2

            # Use time series models for longer timeframes
            next_week_price = ts_predictions.get('next_week', current_price)
            next_month_price = ts_predictions.get('next_month', current_price)

            predictions = {
                "nextDay": {
                    "predictedPrice": float(next_day_price),
                    "predictedReturn": float(((next_day_price / current_price) - 1) * 100),
                    "confidence": 0.75,
                    "lowerBound": float(next_day_price * 0.98),
                    "upperBound": float(next_day_price * 1.02)
                },
                "nextWeek": {
                    "predictedPrice": float(next_week_price),
                    "predictedReturn": float(((next_week_price / current_price) - 1) * 100),
                    "confidence": 0.68,
                    "lowerBound": float(next_week_price * 0.96),
                    "upperBound": float(next_week_price * 1.04)
                },
                "nextMonth": {
                    "predictedPrice": float(next_month_price),
                    "predictedReturn": float(((next_month_price / current_price) - 1) * 100),
                    "confidence": 0.55,
                    "lowerBound": float(next_month_price * 0.93),
                    "upperBound": float(next_month_price * 1.07)
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

            # Generate recommendation
            avg_return = (predictions['nextDay']['predictedReturn'] + predictions['nextWeek']['predictedReturn']) / 2

            if avg_return > 3:
                recommendation = "STRONG_BUY"
                analysis = f"Strong upward trend predicted with {avg_return:.1f}% expected return"
            elif avg_return > 1:
                recommendation = "BUY"
                analysis = f"Positive outlook with {avg_return:.1f}% expected return"
            elif avg_return > -1:
                recommendation = "HOLD"
                analysis = f"Stable outlook with {avg_return:.1f}% expected return"
            elif avg_return > -3:
                recommendation = "SELL"
                analysis = f"Negative trend with {avg_return:.1f}% expected return"
            else:
                recommendation = "STRONG_SELL"
                analysis = f"Strong downward trend with {avg_return:.1f}% expected return"

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
