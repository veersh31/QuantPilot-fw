"""
FastAPI Service for ML Stock/ETF Price Predictions
Professional-grade ML predictions with proper libraries
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from feature_engineering import engineer_dataset, normalize_features, extract_features
from models import MLEnsemble, TimeSeriesModels, evaluate_model
from backtesting import Backtester

app = FastAPI(title="QuantPilot ML Service", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/")
async def root():
    return {
        "service": "QuantPilot ML Prediction Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


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

        # Fetch historical data
        print("[1/6] Fetching historical data...")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=730)  # 2 years

        ticker = yf.Ticker(symbol)
        df = ticker.history(start=start_date, end=end_date)

        if df.empty or len(df) < 250:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient data for {symbol}. Need at least 250 days, got {len(df)}"
            )

        # Prepare data
        df = df.reset_index()
        df.columns = [col.lower() for col in df.columns]
        df = df.rename(columns={'date': 'date'})
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

        print(f"   ✓ Fetched {len(df)} data points for {symbol}")

        # Fetch SPY data for market-relative features (unless symbol IS SPY)
        spy_df = None
        if symbol != 'SPY':
            try:
                spy_ticker = yf.Ticker('SPY')
                spy_df = spy_ticker.history(start=start_date, end=end_date)
                if not spy_df.empty:
                    spy_df = spy_df.reset_index()
                    spy_df.columns = [col.lower() for col in spy_df.columns]
                    print(f"   ✓ Fetched {len(spy_df)} SPY data points for beta calculation")
                else:
                    print("   ⚠ SPY data unavailable, skipping market-relative features")
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
