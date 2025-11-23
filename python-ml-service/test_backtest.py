"""
Quick test to debug backtesting
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from feature_engineering import engineer_dataset, normalize_features
from models import MLEnsemble
from backtesting import Backtester

# Fetch data
symbol = 'AAPL'
end_date = datetime.now()
start_date = end_date - timedelta(days=730)

ticker = yf.Ticker(symbol)
df = ticker.history(start=start_date, end=end_date)
df = df.reset_index()
df.columns = [col.lower() for col in df.columns]
df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

print(f"Total data points: {len(df)}")

# Engineer features
X, y_returns, dates, prices = engineer_dataset(df, look_forward=1, spy_df=None)
print(f"Features shape: {X.shape}")
print(f"Returns shape: {y_returns.shape}")
print(f"Prices shape: {prices.shape}")

# Normalize
X_normalized, means, stds = normalize_features(X)

# Split
split_idx = int(len(X) * 0.8)
X_test = X_normalized.iloc[split_idx:]
test_dates = dates[split_idx:]

# Get actual prices for test period
test_start_idx = 200 + split_idx
test_end_idx = test_start_idx + len(X_test) + 1
actual_test_prices = df['close'].iloc[test_start_idx:test_end_idx].reset_index(drop=True)

print(f"\nTest set:")
print(f"X_test shape: {X_test.shape}")
print(f"Test prices shape: {actual_test_prices.shape}")
print(f"First 5 test prices: {actual_test_prices.head().tolist()}")

# Train model on returns
y_train = y_returns.iloc[:split_idx]
model = MLEnsemble()
model.train(X_normalized.iloc[:split_idx], y_train)

# Get predictions (returns)
test_predictions = model.predict(X_test)
test_confidence = model.calculate_confidence(X_test)

print(f"\nTest predictions (returns):")
print(f"Predictions shape: {test_predictions.shape}")
print(f"First 10 predictions: {test_predictions[:10]}")
print(f"First 10 confidences: {test_confidence[:10]}")

# Check buy signals
buy_signals = 0
for i in range(len(test_predictions)):
    if test_predictions[i] > 0.005 and test_confidence[i] > 0.60:
        buy_signals += 1
        if buy_signals <= 3:
            print(f"BUY signal {buy_signals}: return={test_predictions[i]:.4f}, conf={test_confidence[i]:.2f}")

print(f"\nTotal buy signals: {buy_signals}")

# Run backtest
print("\nRunning backtest...")
backtester = Backtester(initial_capital=10000)
result = backtester.run_backtest(model, X_test, actual_test_prices, test_dates)
print(f"Backtest result: {result['total_return']:.2f}%")
print(f"Number of trades: {len(result['trades'])}")
