"""
FastAPI Service for ML Stock/ETF Price Predictions & Stock Data
Professional-grade ML predictions with comprehensive stock data endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import time

from feature_engineering import engineer_dataset, normalize_features, extract_features
from models import MLEnsemble, TimeSeriesModels, evaluate_model
from backtesting import Backtester
from stock_data import StockDataFetcher
from technical_indicators import TechnicalIndicators
from cache import cache

app = FastAPI(
    title="QuantPilot ML & Stock Data Service",
    version="2.0.0",
    description="Unified Python backend for stock data, technical indicators, and ML predictions"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
stock_fetcher = StockDataFetcher(cache_ttl=300)


class PredictionRequest(BaseModel):
    symbol: str


class PredictionResponse(BaseModel):
    symbol: str
    current_price: float
    predictions: Dict
    model_performances: Dict
    feature_importance: List[Dict[str, Any]]
    confidence: float
    recommendation: str
    analysis: str
    backtest: Dict
    data_points: int
    last_update: str


class HistoricalRequest(BaseModel):
    symbol: str
    days: Optional[int] = 730


class QuoteRequest(BaseModel):
    symbol: str


class FundamentalsRequest(BaseModel):
    symbol: str


class IndicatorsRequest(BaseModel):
    symbol: str
    days: Optional[int] = 200


class FeaturesRequest(BaseModel):
    symbol: str
    days: Optional[int] = 730


@app.get("/")
async def root():
    return {
        "service": "QuantPilot ML & Stock Data Service",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "stock_data": ["/quote", "/historical", "/fundamentals"],
            "technical_analysis": ["/indicators"],
            "ml_features": ["/features"],
            "ml_predictions": ["/predict"]
        }
    }


@app.get("/health")
async def health_check():
    cache.cleanup_expired()
    return {
        "status": "healthy",
        "cache_stats": cache.stats()
    }


@app.post("/historical")
async def get_historical_data(request: HistoricalRequest):
    """
    Fetch historical OHLCV data for a symbol

    Returns cached data if available, otherwise fetches from Yahoo Finance
    """
    symbol = request.symbol.upper()
    cache_key = f"historical:{symbol}:{request.days}"

    try:
        # Check cache first
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        # Fetch fresh data
        df = stock_fetcher.fetch_historical_data(symbol, days=request.days)

        response = {
            "symbol": symbol,
            "data": df.to_dict('records'),
            "dataPoints": len(df),
            "timestamp": datetime.now().isoformat()
        }

        # Cache for 5 minutes
        cache.set(cache_key, response, ttl=300)

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data: {str(e)}")


@app.post("/quote")
async def get_quote(request: QuoteRequest):
    """
    Fetch current quote data for a symbol

    Returns real-time price, change, volume, and key metrics
    """
    symbol = request.symbol.upper()
    cache_key = f"quote:{symbol}"

    try:
        # Check cache (1 minute TTL for quotes)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        # Fetch fresh quote
        quote_data = stock_fetcher.fetch_quote(symbol)

        # Cache for 1 minute
        cache.set(cache_key, quote_data, ttl=60)

        return quote_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote: {str(e)}")


@app.post("/fundamentals")
async def get_fundamentals(request: FundamentalsRequest):
    """
    Fetch fundamental data for a stock or ETF

    Returns different metrics based on whether symbol is stock or ETF
    """
    symbol = request.symbol.upper()
    cache_key = f"fundamentals:{symbol}"

    try:
        # Check cache (1 hour TTL for fundamentals)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        # Fetch fresh fundamentals
        fundamentals_data = stock_fetcher.fetch_fundamentals(symbol)

        # Cache for 1 hour
        cache.set(cache_key, fundamentals_data, ttl=3600)

        return fundamentals_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fundamentals: {str(e)}")


@app.post("/indicators")
async def calculate_indicators(request: IndicatorsRequest):
    """
    Calculate all technical indicators for a symbol

    Returns comprehensive technical analysis including RSI, MACD, Bollinger Bands,
    Moving Averages, Stochastic, VWAP, ADX, Williams %R, CCI, and overall signal
    """
    symbol = request.symbol.upper()
    cache_key = f"indicators:{symbol}:{request.days}"

    try:
        # Check cache (5 minute TTL)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        print(f"\n[Indicators] Calculating for {symbol} ({request.days} days)")

        # Fetch historical data
        df = stock_fetcher.fetch_historical_data(symbol, days=request.days)

        # Calculate all technical indicators
        analysis = TechnicalIndicators.calculate_all(df)

        response = {
            "symbol": symbol,
            "analysis": analysis,
            "dataPoints": len(df),
            "currentPrice": float(df['close'].iloc[-1])
        }

        # Cache for 5 minutes
        cache.set(cache_key, response, ttl=300)

        print(f"[Indicators] Complete for {symbol} - Overall: {analysis['overallSignal']}")

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to calculate indicators: {str(e)}")


@app.post("/features")
async def get_engineered_features(request: FeaturesRequest):
    """
    Get all 40+ engineered ML features for a symbol

    Useful for custom analysis and understanding feature importance
    """
    symbol = request.symbol.upper()
    cache_key = f"features:{symbol}:{request.days}"

    try:
        # Check cache (5 minute TTL)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        print(f"\n[Features] Extracting for {symbol}")

        # Fetch historical data
        df = stock_fetcher.fetch_historical_data(symbol, days=request.days)

        # Fetch SPY data for market-relative features (unless symbol IS SPY)
        spy_df = None
        if symbol != 'SPY':
            try:
                spy_df = stock_fetcher.fetch_historical_data('SPY', days=request.days)
                print(f"   ✓ Fetched SPY data for beta calculation")
            except:
                print(f"   ⚠ Could not fetch SPY data")

        # Extract current features
        current_features = extract_features(df, -1, spy_df=spy_df)

        # Also get historical features for last 30 days
        historical_features = []
        lookback = min(30, len(df) - 200)  # Last 30 days or available
        for i in range(lookback):
            idx = -(i + 1)
            try:
                feat = extract_features(df, idx, spy_df=spy_df)
                feat['date'] = df.iloc[idx]['date']
                historical_features.append(feat)
            except:
                continue

        historical_features.reverse()  # Oldest to newest

        response = {
            "symbol": symbol,
            "current_features": current_features,
            "historical_features": historical_features,
            "feature_count": len(current_features),
            "timestamp": datetime.now().isoformat()
        }

        # Cache for 5 minutes
        cache.set(cache_key, response, ttl=300)

        print(f"[Features] Extracted {len(current_features)} features for {symbol}")

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to extract features: {str(e)}")


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Generate ML predictions for stock/ETF

    This endpoint:
    1. Fetches 2 years of historical data
    2. Engineers 40+ features
    3. Trains ensemble of ML models
    4. Generates predictions for multiple timeframes
    5. Runs backtesting
    6. Returns comprehensive results
    """
    symbol = request.symbol.upper()

    try:
        print(f"\n{'='*60}")
        print(f"[ML Service] Processing prediction request for {symbol}")
        print(f"{'='*60}\n")

        # Fetch historical data using unified fetcher
        print("[1/6] Fetching historical data...")
        df = stock_fetcher.fetch_historical_data(symbol, days=730)

        if len(df) < 250:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for {symbol}. Need at least 250 days, got {len(df)}"
            )

        print(f"   ✓ Fetched {len(df)} data points for {symbol}")

        # Fetch SPY data for market-relative features (unless symbol IS SPY)
        spy_df = None
        if symbol != 'SPY':
            try:
                spy_df = stock_fetcher.fetch_historical_data('SPY', days=730)
                print(f"   ✓ Fetched {len(spy_df)} SPY data points for beta calculation")
            except Exception as e:
                print(f"   ⚠ Could not fetch SPY data: {e}")
                spy_df = None

        # Engineer features
        print("[2/6] Engineering features...")
        X, y_returns, dates, prices = engineer_dataset(df, look_forward=1, spy_df=spy_df)
        print(f"   ✓ Engineered {X.shape[1]} features from {len(X)} samples")
        print(f"   ✓ Target: Predicting returns (not absolute prices)")

        # Normalize features
        X_normalized, means, stds = normalize_features(X)

        # Train/test split (80/20)
        split_idx = int(len(X) * 0.8)
        X_train = X_normalized.iloc[:split_idx]
        y_train = y_returns.iloc[:split_idx]  # Training on returns
        X_test = X_normalized.iloc[split_idx:]
        y_test = y_returns.iloc[split_idx:]  # Testing on returns
        test_prices = prices.iloc[split_idx:]  # Need prices to convert returns back
        test_dates = dates[split_idx:]

        # Train ML Ensemble (on returns)
        print("[3/6] Training ML models on returns...")
        ml_ensemble = MLEnsemble()
        train_metrics = ml_ensemble.train(X_train, y_train)
        print(f"   ✓ Models trained - R²: {train_metrics['r2']:.3f}")

        # Train Time Series Models
        print("[4/6] Training time series models...")
        ts_models = TimeSeriesModels()
        ts_models.train(df['close'])
        print(f"   ✓ Time series models trained")

        # Evaluate on test set
        print("[5/6] Evaluating models...")
        test_return_predictions = ml_ensemble.predict(X_test)
        test_performance = evaluate_model(y_test.values, test_return_predictions)
        confidence_scores = ml_ensemble.calculate_confidence(X_test)
        print(f"   ✓ Test MAE: {test_performance['mae']:.4f} (return), Accuracy: {test_performance['directional_accuracy']:.1f}%")

        # Get current features for prediction
        current_features = extract_features(df, -1, spy_df=spy_df)
        current_features_df = pd.DataFrame([current_features])

        # Normalize using training set statistics (not single row statistics!)
        current_features_normalized = pd.DataFrame()
        for col in current_features_df.columns:
            if col in means and col in stds:
                current_features_normalized[col] = (current_features_df[col] - means[col]) / stds[col]
            else:
                current_features_normalized[col] = 0

        # Final safety check for NaN/inf
        current_features_normalized = current_features_normalized.replace([np.inf, -np.inf], 0)
        current_features_normalized = current_features_normalized.fillna(0)

        # Generate predictions
        # Get real-time current price using fast_info (most reliable real-time price)
        try:
            ticker = yf.Ticker(symbol)
            # Use fast_info for quick real-time price access
            current_price = float(ticker.fast_info.get('lastPrice', df.iloc[-1]['close']))
            print(f"   ✓ Real-time price: ${current_price:.2f} (from fast_info)")
        except Exception as e:
            # Fallback to info if fast_info fails
            try:
                info = ticker.info
                current_price = float(info.get('currentPrice') or info.get('regularMarketPrice') or df.iloc[-1]['close'])
                print(f"   ✓ Real-time price: ${current_price:.2f} (from info)")
            except Exception as e2:
                print(f"   ⚠ Could not fetch real-time price, using last close: {e2}")
                current_price = float(df.iloc[-1]['close'])

        # Next day prediction (ML models predict RETURN, convert to price)
        next_day_return = float(ml_ensemble.predict(current_features_normalized)[0])
        next_day_pred_price = current_price * (1 + next_day_return)  # Convert return to price
        next_day_conf = float(ml_ensemble.calculate_confidence(current_features_normalized)[0])

        # Multi-step predictions (Time Series models - these still predict prices)
        next_week_ts = ts_models.predict(steps=5)
        next_month_ts = ts_models.predict(steps=20)

        # Calculate confidence intervals (based on return std, converted to price)
        next_day_return_std = test_performance['rmse']  # This is now std of returns
        next_day_lower = current_price * (1 + next_day_return - 2 * next_day_return_std)
        next_day_upper = current_price * (1 + next_day_return + 2 * next_day_return_std)

        # Week/month intervals (wider due to time)
        week_return = (next_week_ts['ensemble'] - current_price) / current_price
        month_return = (next_month_ts['ensemble'] - current_price) / current_price

        predictions = {
            'nextDay': {
                'predictedPrice': round(next_day_pred_price, 2),
                'predictedReturn': round(next_day_return * 100, 2),  # Return in %
                'confidence': round(next_day_conf, 2),
                'lowerBound': round(next_day_lower, 2),
                'upperBound': round(next_day_upper, 2),
                'modelName': 'ML Ensemble'
            },
            'nextWeek': {
                'predictedPrice': round(next_week_ts['ensemble'], 2),
                'predictedReturn': round(week_return * 100, 2),
                'confidence': round(next_week_ts['confidence'], 2),
                'lowerBound': round(current_price * (1 + week_return - 2 * next_day_return_std * 1.5), 2),
                'upperBound': round(current_price * (1 + week_return + 2 * next_day_return_std * 1.5), 2),
                'modelName': 'Time Series Ensemble'
            },
            'nextMonth': {
                'predictedPrice': round(next_month_ts['ensemble'], 2),
                'predictedReturn': round(month_return * 100, 2),
                'confidence': round(next_month_ts['confidence'], 2),
                'lowerBound': round(current_price * (1 + month_return - 2 * next_day_return_std * 2), 2),
                'upperBound': round(current_price * (1 + month_return + 2 * next_day_return_std * 2), 2),
                'modelName': 'Time Series Ensemble'
            }
        }

        # Feature importance
        importance = ml_ensemble.get_feature_importance()
        feature_importance = [
            {'feature': name, 'importance': imp}
            for name, imp in list(importance.items())[:10]
        ]

        # Run backtest
        print("[6/6] Running backtest...")
        backtester = Backtester(initial_capital=10000)

        # Backtester needs actual price series for the test period
        # Get the actual closing prices for the test period from original data
        test_start_idx = 200 + split_idx  # Original data starts at 200, plus train size
        test_end_idx = test_start_idx + len(X_test) + 1  # +1 for next day's price
        actual_test_prices = df['close'].iloc[test_start_idx:test_end_idx].reset_index(drop=True)

        backtest_result = backtester.run_backtest(ml_ensemble, X_test, actual_test_prices, test_dates)
        print(f"   ✓ Backtest complete - Return: {backtest_result['total_return']:.2f}%")

        # Generate recommendation (use the predicted return)
        recommendation = generate_recommendation(next_day_return, next_day_conf)

        # Generate analysis
        analysis = generate_analysis(predictions, test_performance, current_price)

        # Overall confidence
        overall_confidence = round((next_day_conf + test_performance['r2']) / 2, 2)

        print(f"\n{'='*60}")
        print(f"[ML Service] Prediction complete for {symbol}")
        print(f"Recommendation: {recommendation}")
        print(f"Next Day: ${next_day_pred_price:.2f} ({next_day_return*100:+.2f}%)")
        print(f"{'='*60}\n")

        return PredictionResponse(
            symbol=symbol,
            current_price=round(current_price, 2),
            predictions=predictions,
            model_performances={
                'ensemble': test_performance
            },
            feature_importance=feature_importance,
            confidence=overall_confidence,
            recommendation=recommendation,
            analysis=analysis,
            backtest={
                'totalReturns': round(backtest_result['total_return'], 2),
                'annualizedReturns': round(backtest_result['metrics']['annualized_return'], 2),
                'sharpeRatio': round(backtest_result['metrics']['sharpe_ratio'], 2),
                'maxDrawdown': round(backtest_result['metrics']['max_drawdown'], 2),
                'winRate': round(backtest_result['metrics']['win_rate'], 1),
                'profitFactor': round(backtest_result['metrics']['profit_factor'], 2),
                'trades': backtest_result['trades'][:50]  # Limit trade history
            },
            data_points=len(df),
            last_update=datetime.now().isoformat()
        )

    except Exception as e:
        print(f"[ML Service] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def generate_recommendation(expected_return: float, confidence: float) -> str:
    """Generate buy/sell recommendation"""
    if confidence < 0.6:
        return 'HOLD'

    if expected_return > 0.05 and confidence > 0.75:
        return 'STRONG_BUY'
    elif expected_return > 0.02:
        return 'BUY'
    elif expected_return < -0.05 and confidence > 0.75:
        return 'STRONG_SELL'
    elif expected_return < -0.02:
        return 'SELL'
    else:
        return 'HOLD'


def generate_analysis(predictions: Dict, performance: Dict, current_price: float) -> str:
    """Generate human-readable analysis"""
    next_day = predictions['nextDay']
    next_week = predictions['nextWeek']
    next_month = predictions['nextMonth']

    next_day_return = ((next_day['predictedPrice'] - current_price) / current_price * 100)
    next_week_return = ((next_week['predictedPrice'] - current_price) / current_price * 100)
    next_month_return = ((next_month['predictedPrice'] - current_price) / current_price * 100)

    analysis = f"""ML models predict:
• Next Day: {next_day_return:+.2f}% (Confidence: {next_day['confidence']*100:.0f}%)
• Next Week: {next_week_return:+.2f}% (Confidence: {next_week['confidence']*100:.0f}%)
• Next Month: {next_month_return:+.2f}% (Confidence: {next_month['confidence']*100:.0f}%)

Model Performance:
• MAE: ${performance['mae']:.2f}
• RMSE: ${performance['rmse']:.2f}
• R²: {performance['r2']:.3f}
• Directional Accuracy: {performance['directional_accuracy']:.1f}%

Confidence Interval: ${next_day['lowerBound']:.2f} - ${next_day['upperBound']:.2f}

Models: Ridge Regression, Lasso, Random Forest, Gradient Boosting, ARIMA, Exponential Smoothing"""

    return analysis


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
