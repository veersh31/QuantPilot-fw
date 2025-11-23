"""
Professional Backtesting Engine for ML Trading Strategy
"""

import numpy as np
import pandas as pd
from typing import Dict, List
from models import MLEnsemble


class Backtester:
    """Backtest ML trading strategy on historical data"""

    def __init__(self, initial_capital: float = 10000.0, commission: float = 0.001):
        self.initial_capital = initial_capital
        self.commission = commission  # 0.1% commission per trade
        self.trades = []

    def run_backtest(
        self,
        model: MLEnsemble,
        X_test: pd.DataFrame,
        y_test: pd.Series,
        dates: List[str]
    ) -> Dict:
        """
        Run backtest of ML trading strategy

        Args:
            model: Trained ML ensemble
            X_test: Test features
            y_test: Actual prices
            dates: Corresponding dates

        Returns:
            Dictionary with backtest results
        """
        print(f"[Backtest] Running backtest on {len(X_test)} data points")

        # Get predictions
        predictions = model.predict(X_test)
        confidence = model.calculate_confidence(X_test)

        # Initialize trading state
        cash = self.initial_capital
        shares = 0
        position = None  # 'LONG' or None
        self.trades = []
        portfolio_values = []
        daily_returns = []
        entry_price = 0

        # Trading simulation
        for i in range(len(X_test) - 1):
            current_price = y_test.iloc[i]
            next_price = y_test.iloc[i + 1]
            predicted_return = predictions[i]  # Model now predicts returns, not prices
            predicted_price = current_price * (1 + predicted_return)  # Convert to price for display
            pred_confidence = confidence[i]

            # Expected return (already predicted by model)
            expected_return = predicted_return

            # Current portfolio value
            current_value = cash + (shares * current_price)
            portfolio_values.append(current_value)

            # Calculate daily return
            if i > 0:
                daily_return = (current_value - portfolio_values[i-1]) / portfolio_values[i-1]
                daily_returns.append(daily_return)

            # =================================================================
            # TRADING LOGIC - More Realistic Strategy
            # =================================================================

            # BUY CONDITIONS:
            # 1. Bullish signal (>0.2% expected return)
            # 2. Good confidence (>=60%)
            # 3. Not already in position
            if expected_return > 0.002 and pred_confidence >= 0.60 and position != 'LONG':
                if cash > 0:
                    # Buy with available cash (minus commission)
                    cost = current_price * (1 + self.commission)
                    shares = cash / cost
                    cash = 0
                    position = 'LONG'
                    entry_price = current_price

                    self.trades.append({
                        'date': dates[i],
                        'action': 'BUY',
                        'price': current_price,
                        'shares': shares,
                        'predicted_price': predicted_price,
                        'confidence': pred_confidence,
                        'profit': 0
                    })

            # SELL CONDITIONS:
            # 1. Take profit: Price increased by 3%+ from entry
            # 2. Stop loss: Price dropped by 2%+ from entry
            # 3. Bearish signal: Expected return < -1% with good confidence
            elif position == 'LONG' and shares > 0:
                should_sell = False
                sell_reason = ''

                # Take profit (+2% gain)
                if current_price >= entry_price * 1.02:
                    should_sell = True
                    sell_reason = 'take_profit'

                # Stop loss (-1.5% loss)
                elif current_price <= entry_price * 0.985:
                    should_sell = True
                    sell_reason = 'stop_loss'

                # Bearish signal
                elif expected_return < -0.002 and pred_confidence >= 0.60:
                    should_sell = True
                    sell_reason = 'bearish_signal'

                # Time-based exit (hold for max 10 days)
                elif len(self.trades) > 0:
                    last_buy_idx = len([t for t in self.trades if t['action'] == 'BUY']) - 1
                    if i - last_buy_idx >= 10:
                        should_sell = True
                        sell_reason = 'time_exit'

                if should_sell:
                    # Sell with commission
                    sell_price = current_price * (1 - self.commission)
                    profit = shares * (sell_price - entry_price * (1 + self.commission))
                    cash = shares * sell_price
                    shares = 0
                    position = None

                    self.trades.append({
                        'date': dates[i],
                        'action': 'SELL',
                        'price': current_price,
                        'shares': 0,
                        'predicted_price': predicted_price,
                        'confidence': pred_confidence,
                        'profit': profit,
                        'reason': sell_reason
                    })

        # Close final position at market
        if shares > 0:
            final_price = y_test.iloc[-1]
            sell_price = final_price * (1 - self.commission)
            profit = shares * (sell_price - entry_price * (1 + self.commission))
            cash = shares * sell_price
            shares = 0

            self.trades.append({
                'date': dates[-1] if len(dates) > 0 else 'final',
                'action': 'SELL',
                'price': final_price,
                'shares': 0,
                'predicted_price': final_price,
                'confidence': 0.5,
                'profit': profit,
                'reason': 'final_exit'
            })

        # Append final value
        final_value = cash
        portfolio_values.append(final_value)

        # Calculate metrics
        metrics = self._calculate_metrics(portfolio_values, daily_returns, final_value)

        return {
            'initial_capital': self.initial_capital,
            'final_value': final_value,
            'total_return': ((final_value - self.initial_capital) / self.initial_capital) * 100,
            'trades': self.trades,
            'metrics': metrics
        }

    def _calculate_metrics(
        self,
        portfolio_values: List[float],
        daily_returns: List[float],
        final_value: float
    ) -> Dict:
        """Calculate comprehensive backtest metrics"""

        # Total return
        total_return = ((final_value - self.initial_capital) / self.initial_capital) * 100

        # Annualized return (assume ~252 trading days per year)
        num_days = len(portfolio_values)
        num_years = num_days / 252
        if num_years > 0 and final_value > 0:
            annualized_return = (np.power(final_value / self.initial_capital, 1 / num_years) - 1) * 100
        else:
            annualized_return = 0

        # Sharpe Ratio (based on daily returns, not trade profits)
        sharpe_ratio = 0
        if len(daily_returns) > 1:
            mean_daily_return = np.mean(daily_returns)
            std_daily_return = np.std(daily_returns)
            if std_daily_return > 0:
                # Annualized Sharpe (assume risk-free rate = 0 for simplicity)
                sharpe_ratio = (mean_daily_return / std_daily_return) * np.sqrt(252)
            else:
                sharpe_ratio = 0

        # Maximum Drawdown
        max_drawdown = 0
        peak = self.initial_capital
        for value in portfolio_values:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak if peak > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        # Win Rate & Trade Statistics
        sell_trades = [t for t in self.trades if t['action'] == 'SELL']
        winning_trades = [t for t in sell_trades if t.get('profit', 0) > 0]
        losing_trades = [t for t in sell_trades if t.get('profit', 0) < 0]

        win_rate = (len(winning_trades) / len(sell_trades) * 100) if sell_trades else 0

        # Profit Factor
        gross_profit = sum(t.get('profit', 0) for t in winning_trades)
        gross_loss = abs(sum(t.get('profit', 0) for t in losing_trades))

        if gross_loss > 0:
            profit_factor = gross_profit / gross_loss
        elif gross_profit > 0:
            profit_factor = 999.0  # Infinite (no losses)
        else:
            profit_factor = 1.0

        # Average win/loss
        avg_win = (gross_profit / len(winning_trades)) if winning_trades else 0
        avg_loss = (gross_loss / len(losing_trades)) if losing_trades else 0

        # Expectancy
        if sell_trades:
            expectancy = (win_rate / 100 * avg_win) - ((1 - win_rate / 100) * avg_loss)
        else:
            expectancy = 0

        return {
            'total_return': float(total_return),
            'annualized_return': float(annualized_return),
            'sharpe_ratio': float(sharpe_ratio),
            'max_drawdown': float(max_drawdown * 100),
            'win_rate': float(win_rate),
            'profit_factor': float(profit_factor),
            'num_trades': len(self.trades),
            'num_wins': len(winning_trades),
            'num_losses': len(losing_trades),
            'avg_win': float(avg_win),
            'avg_loss': float(avg_loss),
            'expectancy': float(expectancy),
            'total_commission': float(self._calculate_total_commission())
        }

    def _calculate_total_commission(self) -> float:
        """Calculate total commission paid"""
        total = 0
        for trade in self.trades:
            if trade['action'] == 'BUY':
                total += trade['price'] * trade['shares'] * self.commission
            elif trade['action'] == 'SELL' and 'profit' in trade:
                # Estimate sell commission (already accounted in profit, but track separately)
                pass
        return total


def walk_forward_validation(
    X: pd.DataFrame,
    y: pd.Series,
    dates: List[str],
    train_size: int = 200,
    test_size: int = 50
) -> Dict:
    """
    Perform walk-forward validation (rolling window)

    This is more realistic than simple train/test split
    """
    results = []

    num_windows = (len(X) - train_size) // test_size

    print(f"[Walk-Forward] Running {num_windows} validation windows")

    for i in range(num_windows):
        start_idx = i * test_size
        train_end = start_idx + train_size
        test_end = min(train_end + test_size, len(X))

        # Split data
        X_train = X.iloc[start_idx:train_end]
        y_train = y.iloc[start_idx:train_end]
        X_test = X.iloc[train_end:test_end]
        y_test = y.iloc[train_end:test_end]
        test_dates = dates[train_end:test_end]

        # Train model
        model = MLEnsemble()
        model.train(X_train, y_train)

        # Backtest
        backtester = Backtester()
        result = backtester.run_backtest(model, X_test, y_test, test_dates)

        results.append(result['metrics'])

    # Aggregate results
    avg_metrics = {}
    for key in results[0].keys():
        values = [r[key] for r in results]
        avg_metrics[key] = {
            'mean': float(np.mean(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values))
        }

    return {
        'num_windows': num_windows,
        'aggregated_metrics': avg_metrics,
        'individual_results': results
    }
