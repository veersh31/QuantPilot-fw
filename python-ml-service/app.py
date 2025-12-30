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
import requests
import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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


class NewsRequest(BaseModel):
    symbol: str


class SearchRequest(BaseModel):
    query: str


class SignalsRequest(BaseModel):
    symbol: str
    data: Dict[str, Any]


class ChatRequest(BaseModel):
    message: str
    portfolio: List[Dict[str, Any]] = []
    selectedStock: Optional[str] = None
    conversationHistory: List[Dict[str, str]] = []
    mlPredictions: Optional[Dict[str, Any]] = None
    portfolioNews: Dict[str, List[Dict[str, Any]]] = {}
    marketNews: List[Dict[str, Any]] = []


class RecommendationsRequest(BaseModel):
    portfolio: List[Dict[str, Any]]
    metrics: Optional[Dict[str, Any]] = None
    selectedStock: Optional[str] = None


@app.get("/")
async def root():
    return {
        "service": "QuantPilot ML & Stock Data Service",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "stock_data": ["/quote", "/historical", "/fundamentals", "/news", "/search"],
            "technical_analysis": ["/indicators", "/indicators/timeseries", "/indicators/signals"],
            "ml_features": ["/features"],
            "ml_predictions": ["/predict"],
            "ai": ["/ai/chat"],
            "portfolio": ["/recommendations"]
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


@app.post("/indicators/timeseries")
async def calculate_indicators_timeseries(request: IndicatorsRequest):
    """
    Calculate technical indicators for every data point (for charting)

    Returns time series data with MACD, RSI, Bollinger Bands, Stochastic for each date.
    Used for rendering charts in the frontend.
    """
    symbol = request.symbol.upper()
    cache_key = f"indicators_timeseries:{symbol}:{request.days}"

    try:
        # Check cache (5 minute TTL)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        print(f"\n[Indicators Timeseries] Calculating for {symbol} ({request.days} days)")

        # Fetch historical data
        df = stock_fetcher.fetch_historical_data(symbol, days=request.days)

        # Calculate timeseries indicators
        timeseries_data = TechnicalIndicators.calculate_timeseries(df)

        response = {
            "symbol": symbol,
            "data": timeseries_data,
            "dataPoints": len(timeseries_data)
        }

        # Cache for 5 minutes
        cache.set(cache_key, response, ttl=300)

        print(f"[Indicators Timeseries] Complete for {symbol} - {len(timeseries_data)} points")

        return response

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to calculate timeseries indicators: {str(e)}")


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


@app.post("/news")
async def get_news(request: NewsRequest):
    """
    Fetch news for a stock symbol using Finnhub API

    Returns recent news articles from the last 7 days
    """
    symbol = request.symbol.upper()
    cache_key = f"news:{symbol}"

    try:
        # Check cache (10 minute TTL for news)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        # Get API key from environment
        api_key = os.getenv('FINNHUB_API_KEY')

        if not api_key:
            print("⚠ FINNHUB_API_KEY not configured, returning demo data")
            # Return demo data if no API key
            demo_news = get_demo_news(symbol)
            return {"news": demo_news}

        # Calculate date range (last 7 days)
        today = datetime.now().strftime('%Y-%m-%d')
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

        # Fetch news from Finnhub
        url = f"https://finnhub.io/api/v1/company-news?symbol={symbol}&from={week_ago}&to={today}&token={api_key}"
        response = requests.get(url, timeout=10)

        if not response.ok:
            raise HTTPException(status_code=500, detail="Failed to fetch news from Finnhub")

        data = response.json()

        # Transform Finnhub response to our format
        news = []
        for item in data[:10]:  # Limit to 10 news items
            news.append({
                "title": item.get("headline", ""),
                "summary": item.get("summary", ""),
                "source": item.get("source", ""),
                "url": item.get("url", ""),
                "publishedAt": datetime.fromtimestamp(item.get("datetime", 0)).isoformat(),
                "sentiment": item.get("sentiment", "neutral"),
                "image": item.get("image", "")
            })

        result = {"news": news}

        # Cache for 10 minutes
        cache.set(cache_key, result, ttl=600)

        return result

    except Exception as e:
        print(f"News API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


@app.post("/search")
async def search_stocks(request: SearchRequest):
    """
    Search for stocks and ETFs by symbol or company name

    Returns matching securities from Yahoo Finance
    """
    query = request.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    cache_key = f"search:{query.lower()}"

    try:
        # Check cache (1 hour TTL for search results)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data

        print(f"[Search] Searching for: {query}")

        # Use yfinance Ticker search through Yahoo Finance web API
        # Note: yfinance doesn't have a direct search API, so we'll use a workaround
        # Try to get ticker info directly if it looks like a symbol
        if len(query) <= 5 and query.isupper():
            try:
                ticker = yf.Ticker(query)
                info = ticker.info

                results = [{
                    "symbol": query,
                    "name": info.get('shortName') or info.get('longName', query),
                    "type": info.get('quoteType', 'EQUITY'),
                    "exchange": info.get('exchange', '')
                }]

                result = {"results": results}
                cache.set(cache_key, result, ttl=3600)
                return result
            except:
                pass

        # For company name searches, use a simple mapping of popular stocks
        # In production, you'd want to use a proper search API or database
        popular_stocks = get_popular_stocks_mapping()

        results = []
        query_lower = query.lower()

        # Search through popular stocks
        for symbol, data in popular_stocks.items():
            if (query_lower in symbol.lower() or
                query_lower in data['name'].lower()):
                results.append({
                    "symbol": symbol,
                    "name": data['name'],
                    "type": data['type'],
                    "exchange": data['exchange']
                })

        # Limit to top 10 results
        results = results[:10]

        result = {"results": results}

        # Cache for 1 hour
        cache.set(cache_key, result, ttl=3600)

        return result

    except Exception as e:
        print(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search stocks: {str(e)}")


@app.post("/indicators/signals")
async def generate_signals(request: SignalsRequest):
    """
    Generate trading signals from technical indicator data

    Analyzes RSI, MACD, Bollinger Bands to produce actionable signals
    """
    symbol = request.symbol.upper()
    data = request.data

    try:
        signals = []

        # RSI signals
        if 'rsi' in data and data['rsi'] is not None:
            rsi = float(data['rsi'])
            if rsi < 30:
                signals.append({
                    "type": "bullish",
                    "indicator": "RSI Oversold",
                    "signal": f"RSI at {rsi:.2f} - Potential oversold condition, watch for reversal",
                    "confidence": 0.75,
                    "timestamp": datetime.now().isoformat()
                })
            elif rsi > 70:
                signals.append({
                    "type": "bearish",
                    "indicator": "RSI Overbought",
                    "signal": f"RSI at {rsi:.2f} - Potential overbought condition",
                    "confidence": 0.75,
                    "timestamp": datetime.now().isoformat()
                })

        # MACD signals
        if all(k in data for k in ['macd', 'signal', 'histogram']):
            macd = float(data['macd'])
            signal = float(data['signal'])
            histogram = float(data['histogram'])

            if histogram > 0 and macd > signal:
                signals.append({
                    "type": "bullish",
                    "indicator": "MACD Crossover",
                    "signal": "Bullish MACD crossover detected - Uptrend strengthening",
                    "confidence": 0.82,
                    "timestamp": datetime.now().isoformat()
                })
            elif histogram < 0 and macd < signal:
                signals.append({
                    "type": "bearish",
                    "indicator": "MACD Crossover",
                    "signal": "Bearish MACD crossover - Downtrend detected",
                    "confidence": 0.82,
                    "timestamp": datetime.now().isoformat()
                })

        # Bollinger Bands signals
        if all(k in data for k in ['price', 'bollinger_upper', 'bollinger_lower']):
            price = float(data['price'])
            bb_upper = float(data['bollinger_upper'])
            bb_lower = float(data['bollinger_lower'])

            if price > bb_upper:
                signals.append({
                    "type": "warning",
                    "indicator": "Bollinger Band",
                    "signal": "Price above upper band - High volatility, potential pullback",
                    "confidence": 0.68,
                    "timestamp": datetime.now().isoformat()
                })
            elif price < bb_lower:
                signals.append({
                    "type": "bullish",
                    "indicator": "Bollinger Band",
                    "signal": "Price below lower band - Volatility extreme, potential bounce",
                    "confidence": 0.72,
                    "timestamp": datetime.now().isoformat()
                })

        return {"signals": signals}

    except Exception as e:
        print(f"Signal generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate signals: {str(e)}")


@app.post("/ai/chat")
async def ai_chat(request: ChatRequest):
    """
    AI-powered chat assistant with stock analysis and recommendations

    Integrates ML predictions, technical analysis, news, and portfolio context
    """
    try:
        # Extract stock symbols from message
        mentioned_symbols = extract_stock_symbols(request.message)

        # Use the first mentioned symbol, or fall back to selectedStock
        target_stock = mentioned_symbols[0] if mentioned_symbols else request.selectedStock

        # Fetch technical indicators for the target stock
        technical_data = None
        is_etf = False
        quote_type = 'stock'

        if target_stock:
            # Get technical indicators
            indicators_request = IndicatorsRequest(symbol=target_stock, days=200)
            try:
                indicators_response = await calculate_indicators(indicators_request)
                technical_data = indicators_response.get('analysis')
            except:
                pass

            # Check if it's an ETF
            try:
                ticker = yf.Ticker(target_stock)
                info = ticker.info
                if info.get('quoteType') == 'ETF':
                    is_etf = True
                    quote_type = 'ETF'
            except:
                pass

        # Fetch news for target stock
        news_data = []
        if target_stock:
            try:
                news_request = NewsRequest(symbol=target_stock)
                news_response = await get_news(news_request)
                news_data = news_response.get('news', [])
            except:
                pass

        # Build context
        portfolio_context = generate_portfolio_context(request.portfolio)
        technical_context = generate_technical_context(target_stock, technical_data, mentioned_symbols)
        news_context = generate_news_context(target_stock, news_data, request.portfolioNews, request.marketNews)
        ml_context = generate_ml_context(target_stock, request.mlPredictions)
        asset_type_guidance = generate_asset_type_guidance(is_etf)

        # Build system prompt
        system_prompt = f"""You are an expert AI trading advisor for QuantPilot with 20+ years of experience in quantitative finance and machine learning.

When responding:
1. Keep responses SHORT and FOCUSED - maximum 3-4 key points
2. Use clear, direct language - no excessive markdown or formatting
3. PRIORITIZE ML predictions when available - cite EXACT predicted prices and returns
4. Combine ML predictions with technical indicators for comprehensive analysis
5. **IMPORTANT**: You have access to news for:
   - The target stock being discussed
   - ALL stocks in the user's portfolio
   - General market news (S&P 500/SPY)
   When news is available, reference specific headlines, their sentiment, and how they impact portfolio holdings
6. If user asks about portfolio or market sentiment, analyze news across all holdings and market trends
7. Give one primary recommendation based on data-driven analysis
8. Mention 1-2 risks or considerations
9. End with a clear actionable suggestion

IMPORTANT: You can answer questions about ANY stock, not just the one currently selected. If the user asks about a specific stock symbol (e.g., AAPL, MSFT, TSLA), provide analysis for that stock even if a different stock is selected in the UI.

{asset_type_guidance}

{portfolio_context}

{news_context}

{ml_context}

{technical_context}

Remember:
- When ML predictions are available, ALWAYS cite the exact predicted prices and percentage returns
- You have access to news for PORTFOLIO stocks and MARKET trends - use this to identify broader impacts
- If user asks "what's happening with my portfolio?" or "how's the market?", analyze all portfolio stock news and market news
- Combine news sentiment across holdings, ML forecasts, and technical analysis for comprehensive recommendations
- Base your analysis on REAL data provided above, not generic advice
- The ML model uses 29+ quantitative features and has been backtested
- When discussing portfolio risk, consider news sentiment across all holdings
- If the user asks about a stock and you don't have technical data for it, acknowledge that and provide general guidance or offer to analyze it if they want"""

        # Build messages array
        messages = []

        # Add conversation history (last 10 messages)
        for msg in request.conversationHistory[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({
                "role": role,
                "content": msg.get("content", "")
            })

        # Add current message if not in history
        if not any(msg.get("content") == request.message for msg in request.conversationHistory):
            messages.append({
                "role": "user",
                "content": request.message
            })

        # Get Groq API key
        groq_api_key = os.getenv('GROQ_API_KEY')
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

        # Call Groq API
        client = Groq(api_key=groq_api_key)

        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                *messages
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024
        )

        ai_response = chat_completion.choices[0].message.content

        return {"response": ai_response}

    except Exception as e:
        print(f"AI Chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate AI response: {str(e)}")


@app.post("/recommendations")
async def get_recommendations(request: RecommendationsRequest):
    """
    Generate portfolio recommendations for rebalancing and optimization

    Analyzes portfolio allocation, diversification, and performance
    """
    try:
        recommendations = []

        if not request.portfolio:
            return {"recommendations": []}

        # Calculate total portfolio value
        total_value = sum(stock.get('price', 0) * stock.get('quantity', 0)
                         for stock in request.portfolio)

        if total_value == 0:
            return {"recommendations": []}

        # Rebalancing recommendations
        rebalancing_needed = []
        for stock in request.portfolio:
            price = stock.get('price', 0)
            quantity = stock.get('quantity', 0)
            symbol = stock.get('symbol', '')

            allocation = (price * quantity) / total_value * 100

            if allocation > 40 or allocation < 5:
                rebalancing_needed.append(symbol)

        if rebalancing_needed:
            recommendations.append({
                "type": "rebalance",
                "title": "Portfolio Rebalancing",
                "description": f"{', '.join(rebalancing_needed)} positions are outside optimal allocation ranges",
                "action": "Review and rebalance to maintain risk profile",
                "priority": "medium"
            })

        # Diversification recommendations
        if len(request.portfolio) < 5:
            recommendations.append({
                "type": "diversify",
                "title": "Increase Diversification",
                "description": "Current portfolio has limited diversification. Consider adding positions across different sectors.",
                "action": "Add 2-3 positions in uncorrelated assets",
                "priority": "medium"
            })

        # Performance recommendations
        if request.metrics and request.metrics.get('totalReturn', 0) < -5:
            recommendations.append({
                "type": "review",
                "title": "Portfolio Review Recommended",
                "description": "Recent performance is underperforming benchmarks. Review strategy and holdings.",
                "action": "Analyze underperforming positions",
                "priority": "high"
            })

        # Dividend optimization
        dividend_stocks = [s.get('symbol', '') for s in request.portfolio
                          if s.get('dividend', 0) > 0]

        if dividend_stocks:
            recommendations.append({
                "type": "dividend",
                "title": "Dividend Reinvestment",
                "description": f"{', '.join(dividend_stocks)} pay dividends. Consider reinvestment strategy.",
                "action": "Set up dividend reinvestment plan (DRIP)",
                "priority": "low"
            })

        return {"recommendations": recommendations}

    except Exception as e:
        print(f"Recommendations error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


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


def get_demo_news(symbol: str) -> List[Dict]:
    """Generate demo news data when API key is not available"""
    return [
        {
            "title": f"{symbol} Reports Strong Quarterly Earnings",
            "summary": "Company beats analyst expectations with revenue growth of 15% year-over-year.",
            "source": "Financial Times",
            "url": "#",
            "publishedAt": (datetime.now() - timedelta(hours=2)).isoformat(),
            "sentiment": "positive",
            "image": ""
        },
        {
            "title": f"Analysts Upgrade {symbol} to 'Buy' Rating",
            "summary": "Major investment firms increase price targets following strong performance.",
            "source": "Bloomberg",
            "url": "#",
            "publishedAt": (datetime.now() - timedelta(hours=5)).isoformat(),
            "sentiment": "positive",
            "image": ""
        }
    ]


def get_popular_stocks_mapping() -> Dict[str, Dict[str, str]]:
    """Mapping of popular stocks for search functionality"""
    return {
        'AAPL': {'name': 'Apple Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'MSFT': {'name': 'Microsoft Corporation', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'GOOGL': {'name': 'Alphabet Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'AMZN': {'name': 'Amazon.com Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'META': {'name': 'Meta Platforms Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'TSLA': {'name': 'Tesla Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'NVDA': {'name': 'NVIDIA Corporation', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'AMD': {'name': 'Advanced Micro Devices', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'NFLX': {'name': 'Netflix Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'DIS': {'name': 'The Walt Disney Company', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'PYPL': {'name': 'PayPal Holdings Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'INTC': {'name': 'Intel Corporation', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'CSCO': {'name': 'Cisco Systems Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'ADBE': {'name': 'Adobe Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'CRM': {'name': 'Salesforce Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'ORCL': {'name': 'Oracle Corporation', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'IBM': {'name': 'International Business Machines', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'QCOM': {'name': 'QUALCOMM Incorporated', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'TXN': {'name': 'Texas Instruments', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'AVGO': {'name': 'Broadcom Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'COST': {'name': 'Costco Wholesale Corporation', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'PEP': {'name': 'PepsiCo Inc.', 'type': 'EQUITY', 'exchange': 'NASDAQ'},
        'KO': {'name': 'The Coca-Cola Company', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'WMT': {'name': 'Walmart Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'JPM': {'name': 'JPMorgan Chase & Co.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'BAC': {'name': 'Bank of America Corporation', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'WFC': {'name': 'Wells Fargo & Company', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'GS': {'name': 'The Goldman Sachs Group', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'MS': {'name': 'Morgan Stanley', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'C': {'name': 'Citigroup Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'V': {'name': 'Visa Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'MA': {'name': 'Mastercard Incorporated', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'JNJ': {'name': 'Johnson & Johnson', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'UNH': {'name': 'UnitedHealth Group', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'PFE': {'name': 'Pfizer Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'ABBV': {'name': 'AbbVie Inc.', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'XOM': {'name': 'Exxon Mobil Corporation', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'CVX': {'name': 'Chevron Corporation', 'type': 'EQUITY', 'exchange': 'NYSE'},
        'SPY': {'name': 'SPDR S&P 500 ETF Trust', 'type': 'ETF', 'exchange': 'NYSE'},
        'QQQ': {'name': 'Invesco QQQ Trust', 'type': 'ETF', 'exchange': 'NASDAQ'},
        'IWM': {'name': 'iShares Russell 2000 ETF', 'type': 'ETF', 'exchange': 'NYSE'},
        'VTI': {'name': 'Vanguard Total Stock Market ETF', 'type': 'ETF', 'exchange': 'NYSE'},
    }


def extract_stock_symbols(message: str) -> List[str]:
    """Extract stock symbols from user message"""
    import re

    lower_message = message.lower()

    # Company name to symbol mapping
    company_map = {
        'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'alphabet': 'GOOGL',
        'amazon': 'AMZN', 'meta': 'META', 'facebook': 'META', 'tesla': 'TSLA',
        'nvidia': 'NVDA', 'amd': 'AMD', 'netflix': 'NFLX', 'disney': 'DIS',
        'paypal': 'PYPL', 'intel': 'INTC', 'cisco': 'CSCO', 'adobe': 'ADBE',
        'salesforce': 'CRM', 'oracle': 'ORCL', 'ibm': 'IBM', 'qualcomm': 'QCOM',
        'texas instruments': 'TXN', 'broadcom': 'AVGO', 'costco': 'COST',
        'pepsi': 'PEP', 'coca cola': 'KO', 'walmart': 'WMT',
        'jpmorgan': 'JPM', 'jp morgan': 'JPM', 'bank of america': 'BAC',
        'wells fargo': 'WFC', 'goldman sachs': 'GS', 'morgan stanley': 'MS',
        'citigroup': 'C', 'visa': 'V', 'mastercard': 'MA',
        'johnson & johnson': 'JNJ', 'unitedhealth': 'UNH', 'pfizer': 'PFE',
        'abbvie': 'ABBV', 'exxon': 'XOM', 'chevron': 'CVX'
    }

    # Check for company names first
    for name, symbol in company_map.items():
        if name in lower_message:
            return [symbol]

    # Then check for uppercase stock symbols
    symbol_pattern = r'\b[A-Z]{1,5}\b'
    matches = re.findall(symbol_pattern, message)
    common_words = ['I', 'A', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'NOT', 'WITH',
                   'AS', 'AT', 'BY', 'TO', 'FROM', 'IN', 'ON', 'OF', 'IS',
                   'IT', 'AI', 'ML', 'USA', 'US', 'ETF', 'PE', 'PS', 'PB',
                   'RSI', 'MACD', 'SMA', 'EMA', 'OK', 'CEO', 'CFO', 'IPO',
                   'API', 'FAQ']
    return [m for m in matches if m not in common_words]


def generate_portfolio_context(portfolio: List[Dict]) -> str:
    """Generate portfolio context string for AI chat"""
    if not portfolio:
        return 'The user has no holdings in their portfolio yet.'

    total_value = sum(stock.get('price', 0) * stock.get('quantity', 0) for stock in portfolio)

    holdings = []
    for stock in portfolio:
        symbol = stock.get('symbol', '')
        quantity = stock.get('quantity', 0)
        price = stock.get('price', 0)
        value = price * quantity
        allocation = (value / total_value * 100) if total_value > 0 else 0

        holdings.append(
            f"{symbol}: {quantity} shares @ ${price:.2f} ({allocation:.1f}% of portfolio)"
        )

    holdings_str = '\n'.join(holdings)
    return f"Portfolio Summary:\n{holdings_str}\nTotal Portfolio Value: ${total_value:.2f}"


def generate_technical_context(target_stock: Optional[str],
                               technical_data: Optional[Dict],
                               mentioned_symbols: List[str]) -> str:
    """Generate technical analysis context string for AI chat"""
    if not target_stock:
        return 'User has not specified a particular stock. Feel free to answer general questions or ask them to specify a stock symbol for detailed analysis.'

    if not technical_data:
        return f"User is asking about {target_stock} - fetching technical data..."

    context_prefix = (
        f"User is asking about {target_stock}. Here are the real technical indicators:"
        if mentioned_symbols
        else f"Currently viewing {target_stock} with real technical indicators:"
    )

    rsi = technical_data.get('rsi', {})
    macd = technical_data.get('macd', {})
    bb = technical_data.get('bollingerBands', {})
    ma = technical_data.get('movingAverages', {})
    stoch = technical_data.get('stochastic', {})
    overall = technical_data.get('overallSignal', 'neutral')

    return f"""
{context_prefix}

RSI: {rsi.get('value', 0):.2f} ({rsi.get('signal', 'neutral')}) - {rsi.get('description', '')}

MACD: {macd.get('macd', 0):.2f}, Signal: {macd.get('signal', 0):.2f}, Histogram: {macd.get('histogram', 0):.2f}
Trend: {macd.get('trend', 'neutral')} - {macd.get('description', '')}

Bollinger Bands: Upper {bb.get('upper', 0):.2f}, Middle {bb.get('middle', 0):.2f}, Lower {bb.get('lower', 0):.2f}
Position: {bb.get('position', 'neutral')} - {bb.get('description', '')}

Moving Averages:
- SMA20: {ma.get('sma20', 0):.2f}
- SMA50: {ma.get('sma50', 0):.2f}
- SMA200: {ma.get('sma200', 0):.2f}
Trend: {ma.get('trend', 'neutral')} - {ma.get('description', '')}

Stochastic: %K {stoch.get('k', 0):.2f}, %D {stoch.get('d', 0):.2f}
Signal: {stoch.get('signal', 'neutral')} - {stoch.get('description', '')}

OVERALL SIGNAL: {overall.upper().replace('_', ' ')}"""


def get_time_ago(date_string: str) -> str:
    """Format time ago from ISO date string"""
    try:
        date = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        now = datetime.now(date.tzinfo) if date.tzinfo else datetime.now()
        diff = now - date
        diff_hours = int(diff.total_seconds() / 3600)
        diff_days = diff_hours // 24

        if diff_days > 0:
            return f"{diff_days}d ago"
        elif diff_hours > 0:
            return f"{diff_hours}h ago"
        else:
            return "Just now"
    except:
        return "Recently"


def generate_news_context(target_stock: Optional[str],
                         news_data: List[Dict],
                         portfolio_news: Dict[str, List[Dict]],
                         market_news: List[Dict]) -> str:
    """Generate news context string for AI chat"""
    context_parts = []

    # Target stock news
    if news_data and target_stock:
        context_parts.append(f"\n📰 LATEST NEWS FOR {target_stock}:")
        for idx, item in enumerate(news_data[:5], 1):
            time_ago = get_time_ago(item.get('publishedAt', ''))
            context_parts.append(f"""
{idx}. {item.get('title', '')}
   Summary: {item.get('summary', '')}
   Source: {item.get('source', '')} | {time_ago}
   Sentiment: {item.get('sentiment', 'neutral')}""")
    elif target_stock:
        context_parts.append(f"No recent news available for {target_stock}.")

    # Portfolio stocks news
    if portfolio_news:
        context_parts.append("\n📊 PORTFOLIO STOCKS NEWS:")
        for symbol, stock_news in portfolio_news.items():
            if stock_news:
                context_parts.append(f"\n{symbol}:")
                for idx, item in enumerate(stock_news[:2], 1):
                    time_ago = get_time_ago(item.get('publishedAt', ''))
                    context_parts.append(
                        f"  {idx}. {item.get('title', '')}\n"
                        f"     {item.get('summary', '')}\n"
                        f"     {time_ago} | {item.get('sentiment', 'neutral')}"
                    )

    # Market news
    if market_news:
        context_parts.append("\n📈 GENERAL MARKET NEWS (SPY/S&P 500):")
        for idx, item in enumerate(market_news[:3], 1):
            time_ago = get_time_ago(item.get('publishedAt', ''))
            context_parts.append(
                f"{idx}. {item.get('title', '')}\n"
                f"   {item.get('summary', '')}\n"
                f"   {time_ago} | {item.get('sentiment', 'neutral')}"
            )

    if context_parts:
        context_parts.append("\nWhen discussing news, reference these actual headlines and their sentiment.")
        return '\n'.join(context_parts)

    return ''


def generate_ml_context(target_stock: Optional[str], ml_predictions: Optional[Dict]) -> str:
    """Generate ML predictions context string for AI chat"""
    if not ml_predictions or not target_stock:
        return ''

    pred = ml_predictions.get('predictions', {})
    backtest = ml_predictions.get('backtest', {})

    context_parts = [
        f"\n🤖 MACHINE LEARNING PRICE PREDICTIONS FOR {target_stock}:",
        f"Current Price: ${ml_predictions.get('current_price', 0)}"
    ]

    # Next day prediction
    if 'nextDay' in pred:
        nd = pred['nextDay']
        context_parts.append(f"""
📊 Next Day Prediction:
   Price: ${nd.get('predictedPrice', 0)} ({'+' if nd.get('predictedReturn', 0) > 0 else ''}{nd.get('predictedReturn', 0)}% return)
   Confidence: {int(nd.get('confidence', 0) * 100)}%
   Range: ${nd.get('lowerBound', 0):.2f} - ${nd.get('upperBound', 0):.2f}""")

    # Next week prediction
    if 'nextWeek' in pred:
        nw = pred['nextWeek']
        context_parts.append(f"""
📈 Next Week Prediction:
   Price: ${nw.get('predictedPrice', 0)} ({'+' if nw.get('predictedReturn', 0) > 0 else ''}{nw.get('predictedReturn', 0)}% return)
   Confidence: {int(nw.get('confidence', 0) * 100)}%""")

    # Next month prediction
    if 'nextMonth' in pred:
        nm = pred['nextMonth']
        context_parts.append(f"""
📉 Next Month Prediction:
   Price: ${nm.get('predictedPrice', 0)} ({'+' if nm.get('predictedReturn', 0) > 0 else ''}{nm.get('predictedReturn', 0)}% return)
   Confidence: {int(nm.get('confidence', 0) * 100)}%""")

    # Backtest results
    if backtest:
        context_parts.append(f"""
🎯 Model Performance (Backtesting):
   Total Returns: {'+' if backtest.get('totalReturns', 0) > 0 else ''}{backtest.get('totalReturns', 0)}%
   Win Rate: {backtest.get('winRate', 0)}%
   Sharpe Ratio: {backtest.get('sharpeRatio', 0)}
   Max Drawdown: {backtest.get('maxDrawdown', 0)}%""")

    context_parts.append(f"""
⚠️ CRITICAL: When discussing {target_stock} price predictions, YOU MUST cite these EXACT predicted values above. Never estimate or guess - use the precise numbers provided by the ML model.""")

    return '\n'.join(context_parts)


def generate_asset_type_guidance(is_etf: bool) -> str:
    """Generate asset-type specific guidance for AI chat"""
    if is_etf:
        return """IMPORTANT: You are analyzing an ETF (Exchange-Traded Fund), NOT an individual stock.
- ETFs are baskets of securities that track indices, sectors, or themes
- Focus on: expense ratio, diversification, holdings, tracking error, sector exposure
- DO NOT mention: earnings, profit margins, company fundamentals, P/E ratios
- Consider: market trends, sector rotation, risk diversification
- ETFs are passive investments - analyze based on composition and cost efficiency"""
    else:
        return """You are analyzing an individual stock.
- Focus on: company fundamentals, earnings, growth, competitive position
- Use valuation metrics: P/E, P/S, P/B ratios
- Consider: profitability, debt levels, management quality
- Evaluate competitive advantages and market position"""


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
