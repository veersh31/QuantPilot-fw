# QuantPilot ML Prediction Service

Professional Python-based machine learning service for stock/ETF price predictions.

## Features

- **40+ Engineered Features**: RSI, MACD, Bollinger Bands, Moving Averages, Momentum, Volatility, Volume indicators
- **6 ML Models**: Ridge Regression, Lasso, Random Forest, Gradient Boosting, ARIMA, Exponential Smoothing
- **Ensemble Predictions**: Weighted combination of all models
- **Multiple Timeframes**: Next day, week, and month predictions
- **Confidence Intervals**: Statistical confidence bounds
- **Backtesting**: Historical strategy validation with performance metrics
- **Feature Importance**: Understand what drives predictions

## Setup

### 1. Install Dependencies

```bash
cd python-ml-service
pip install -r requirements.txt
```

Or use a virtual environment (recommended):

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Service

```bash
python app.py
```

Or with uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The service will start on `http://localhost:8000`

### 3. Test the API

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL"}'
```

Or visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## API Endpoints

### `POST /predict`

Generate ML predictions for a stock/ETF.

**Request:**
```json
{
  "symbol": "AAPL"
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "current_price": 185.50,
  "predictions": {
    "nextDay": {
      "predictedPrice": 186.20,
      "confidence": 0.78,
      "lowerBound": 184.50,
      "upperBound": 187.90,
      "modelName": "ML Ensemble"
    },
    "nextWeek": {...},
    "nextMonth": {...}
  },
  "model_performances": {...},
  "feature_importance": [...],
  "confidence": 0.75,
  "recommendation": "BUY",
  "analysis": "...",
  "backtest": {...}
}
```

### `GET /health`

Health check endpoint.

## Architecture

```
app.py                    # FastAPI server
├── feature_engineering.py # Feature extraction (40+ features)
├── models.py             # ML models (scikit-learn, statsmodels)
└── backtesting.py        # Backtesting engine
```

## Models Used

1. **Ridge Regression**: Linear model with L2 regularization
2. **Lasso**: Linear model with L1 regularization (feature selection)
3. **Random Forest**: Ensemble of 100 decision trees
4. **Gradient Boosting**: Boosted trees with 100 estimators
5. **ARIMA**: Time series model for trend forecasting
6. **Exponential Smoothing**: Holt's method with trend

## Performance

- Typical prediction time: 5-10 seconds per symbol
- Accuracy: 55-65% directional accuracy
- R²: 0.4-0.7 depending on stock volatility
- Trained on 2 years of daily data

## Production Deployment

### Docker (Optional)

Create `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t quantpilot-ml .
docker run -p 8000:8000 quantpilot-ml
```

### Environment Variables

Create `.env` file (optional):

```env
LOG_LEVEL=INFO
MAX_WORKERS=4
CACHE_TTL=300
```

## Troubleshooting

**Issue: "No module named 'sklearn'"**
- Solution: `pip install scikit-learn`

**Issue: Predictions taking too long**
- Solution: Reduce `n_estimators` in RandomForest/GradientBoosting models

**Issue: "Insufficient data" error**
- Solution: Stock needs at least 250 days of historical data

## License

Part of QuantPilot project.
