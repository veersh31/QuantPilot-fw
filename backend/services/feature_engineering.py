"""
Professional ML Feature Engineering for Stock/ETF Prediction
Extracts 40+ features from historical price data
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple


def calculate_rsi(prices: pd.Series, period: int = 14) -> float:
    """Calculate RSI using Wilder's smoothing method"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50.0


def calculate_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, float]:
    """Calculate MACD indicator"""
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()

    macd = ema_fast - ema_slow
    macd_signal = macd.ewm(span=signal, adjust=False).mean()
    macd_hist = macd - macd_signal

    return {
        'macd': macd.iloc[-1],
        'signal': macd_signal.iloc[-1],
        'histogram': macd_hist.iloc[-1]
    }


def calculate_bollinger_bands(prices: pd.Series, period: int = 20, num_std: int = 2) -> Dict[str, float]:
    """Calculate Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()

    upper = sma + (std * num_std)
    lower = sma - (std * num_std)

    current_price = prices.iloc[-1]
    upper_val = upper.iloc[-1]
    lower_val = lower.iloc[-1]
    middle_val = sma.iloc[-1]

    # Position within bands (0 = at lower, 1 = at upper)
    position = (current_price - lower_val) / (upper_val - lower_val) if (upper_val - lower_val) > 0 else 0.5

    return {
        'upper': upper_val,
        'middle': middle_val,
        'lower': lower_val,
        'position': position
    }


def calculate_stochastic(df: pd.DataFrame, period: int = 14) -> Dict[str, float]:
    """Calculate Stochastic Oscillator"""
    low_min = df['low'].rolling(window=period).min()
    high_max = df['high'].rolling(window=period).max()

    k = 100 * (df['close'] - low_min) / (high_max - low_min)
    d = k.rolling(window=3).mean()

    return {
        'k': k.iloc[-1] if not pd.isna(k.iloc[-1]) else 50.0,
        'd': d.iloc[-1] if not pd.isna(d.iloc[-1]) else 50.0
    }


def calculate_atr(df: pd.DataFrame, period: int = 14) -> float:
    """Calculate Average True Range"""
    high_low = df['high'] - df['low']
    high_close = np.abs(df['high'] - df['close'].shift())
    low_close = np.abs(df['low'] - df['close'].shift())

    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()

    return atr.iloc[-1] if not pd.isna(atr.iloc[-1]) else 0.0


def calculate_obv(df: pd.DataFrame) -> float:
    """Calculate On-Balance Volume"""
    obv = (np.sign(df['close'].diff()) * df['volume']).fillna(0).cumsum()
    return obv.iloc[-1]


def calculate_vwap(df: pd.DataFrame, period: int = 20) -> float:
    """Calculate Volume Weighted Average Price"""
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    vwap = (typical_price * df['volume']).rolling(window=period).sum() / df['volume'].rolling(window=period).sum()
    return vwap.iloc[-1] if not pd.isna(vwap.iloc[-1]) else df['close'].iloc[-1]


def extract_features(df: pd.DataFrame, index: int = -1, spy_df: pd.DataFrame = None) -> Dict[str, float]:
    """
    Extract high-signal features for ML prediction
    Focus on features proven to work in quantitative trading
    """
    if len(df) < 200:
        raise ValueError(f"Need at least 200 data points, got {len(df)}")

    # Use all data up to index
    if index == -1:
        data = df.copy()
    else:
        data = df.iloc[:index + 1].copy()

    current = data.iloc[-1]
    close_prices = data['close']
    high_prices = data['high']
    low_prices = data['low']
    volume = data['volume']

    features = {}

    # =================================================================
    # 1. MOMENTUM FEATURES (trend-following)
    # =================================================================

    # Log returns (more stable than simple returns)
    features['log_return_1d'] = np.log(close_prices.iloc[-1] / close_prices.iloc[-2]) if len(close_prices) > 1 else 0
    features['log_return_5d'] = np.log(close_prices.iloc[-1] / close_prices.iloc[-6]) if len(close_prices) > 5 else 0
    features['log_return_21d'] = np.log(close_prices.iloc[-1] / close_prices.iloc[-22]) if len(close_prices) > 21 else 0

    # MACD (momentum indicator)
    macd = calculate_macd(close_prices)
    features['macd_line'] = macd['macd']
    features['macd_signal'] = macd['signal']
    features['macd_histogram'] = macd['histogram']

    # =================================================================
    # 2. MEAN REVERSION FEATURES
    # =================================================================

    # RSI
    features['rsi'] = calculate_rsi(close_prices, 14)
    features['rsi_oversold'] = 1 if features['rsi'] < 30 else 0
    features['rsi_overbought'] = 1 if features['rsi'] > 70 else 0

    # Bollinger Band Z-score (how many std devs from mean)
    bb = calculate_bollinger_bands(close_prices)
    bb_width = bb['upper'] - bb['lower']
    if bb_width > 0:
        features['bb_zscore'] = (current['close'] - bb['middle']) / (bb_width / 4)  # /4 because width is 4 std devs
    else:
        features['bb_zscore'] = 0

    # Price-to-EMA ratios (mean reversion signals)
    ema_20 = close_prices.ewm(span=20, adjust=False).mean().iloc[-1]
    ema_50 = close_prices.ewm(span=50, adjust=False).mean().iloc[-1]
    features['price_to_ema20'] = (current['close'] / ema_20 - 1) if ema_20 > 0 else 0
    features['price_to_ema50'] = (current['close'] / ema_50 - 1) if ema_50 > 0 else 0

    # =================================================================
    # 3. VOLATILITY FEATURES
    # =================================================================

    # Realized volatility (annualized)
    returns = close_prices.pct_change()
    features['realized_vol_5d'] = returns.iloc[-5:].std() * np.sqrt(252) if len(returns) >= 5 else 0
    features['realized_vol_21d'] = returns.iloc[-21:].std() * np.sqrt(252) if len(returns) >= 21 else 0

    # ATR (normalized by price)
    atr = calculate_atr(data, 14)
    features['atr_normalized'] = atr / current['close'] if current['close'] > 0 else 0

    # High-Low range (normalized)
    features['hl_range_normalized'] = (current['high'] - current['low']) / current['close'] if current['close'] > 0 else 0

    # Parkinson volatility estimator (more efficient than close-to-close)
    if len(data) >= 20:
        hl_ratio = np.log(high_prices.iloc[-20:] / low_prices.iloc[-20:])
        parkinson_vol = np.sqrt(np.mean(hl_ratio ** 2) / (4 * np.log(2))) * np.sqrt(252)
        features['parkinson_vol'] = parkinson_vol
    else:
        features['parkinson_vol'] = 0

    # Volatility regime (high vs low)
    vol_21d = features['realized_vol_21d']
    vol_63d = returns.iloc[-63:].std() * np.sqrt(252) if len(returns) >= 63 else vol_21d
    features['vol_regime'] = (vol_21d / vol_63d - 1) if vol_63d > 0 else 0

    # =================================================================
    # 4. LIQUIDITY / MICROSTRUCTURE FEATURES
    # =================================================================

    # Volume z-score (how unusual is today's volume)
    volume_mean = volume.iloc[-20:].mean()
    volume_std = volume.iloc[-20:].std()
    if volume_std > 0:
        features['volume_zscore'] = (current['volume'] - volume_mean) / volume_std
    else:
        features['volume_zscore'] = 0

    # Volume change
    if len(volume) > 1:
        features['volume_change'] = (current['volume'] / volume.iloc[-2] - 1) if volume.iloc[-2] > 0 else 0
    else:
        features['volume_change'] = 0

    # Turnover (volume / price)
    features['turnover'] = current['volume'] * current['close']

    # VWAP deviation (how far from fair value)
    vwap = calculate_vwap(data, 20)
    features['vwap_deviation'] = (current['close'] / vwap - 1) if vwap > 0 else 0

    # Volume trend
    vol_sma_5 = volume.iloc[-5:].mean()
    vol_sma_20 = volume.iloc[-20:].mean()
    features['volume_trend'] = (vol_sma_5 / vol_sma_20 - 1) if vol_sma_20 > 0 else 0

    # =================================================================
    # 5. RELATIVE STRENGTH FEATURES (vs market)
    # =================================================================

    # If SPY data is provided, calculate beta-adjusted returns
    if spy_df is not None and len(spy_df) >= len(data):
        try:
            # Align data
            spy_returns = spy_df['close'].pct_change()
            stock_returns = close_prices.pct_change()

            # Calculate rolling beta (21-day)
            if len(stock_returns) >= 21:
                # Simple linear regression beta
                valid_idx = ~(stock_returns.isna() | spy_returns[-len(stock_returns):].isna())
                if valid_idx.sum() >= 21:
                    recent_stock = stock_returns[valid_idx].iloc[-21:]
                    recent_spy = spy_returns[-len(stock_returns):][valid_idx].iloc[-21:]

                    covariance = recent_stock.cov(recent_spy)
                    spy_variance = recent_spy.var()
                    beta = covariance / spy_variance if spy_variance > 0 else 1.0

                    # Market residual return (alpha)
                    spy_return_1d = spy_returns.iloc[-1] if len(spy_returns) > 0 else 0
                    stock_return_1d = stock_returns.iloc[-1] if len(stock_returns) > 0 else 0
                    features['market_residual_return'] = stock_return_1d - beta * spy_return_1d
                    features['beta_to_spy'] = beta
                else:
                    features['market_residual_return'] = 0
                    features['beta_to_spy'] = 1.0
            else:
                features['market_residual_return'] = 0
                features['beta_to_spy'] = 1.0

            # SPY relative strength
            spy_return_21d = spy_df['close'].iloc[-1] / spy_df['close'].iloc[-22] - 1 if len(spy_df) >= 22 else 0
            stock_return_21d = close_prices.iloc[-1] / close_prices.iloc[-22] - 1 if len(close_prices) >= 22 else 0
            features['relative_strength_vs_spy'] = stock_return_21d - spy_return_21d

        except Exception:
            features['market_residual_return'] = 0
            features['beta_to_spy'] = 1.0
            features['relative_strength_vs_spy'] = 0
    else:
        features['market_residual_return'] = 0
        features['beta_to_spy'] = 1.0
        features['relative_strength_vs_spy'] = 0

    # =================================================================
    # 6. ADDITIONAL CLEAN SIGNALS
    # =================================================================

    # Gap (overnight return)
    if len(data) > 1:
        features['gap'] = (current['open'] / data.iloc[-2]['close'] - 1) if data.iloc[-2]['close'] > 0 else 0
    else:
        features['gap'] = 0

    # Intraday return
    features['intraday_return'] = (current['close'] / current['open'] - 1) if current['open'] > 0 else 0

    # Price action (close relative to high-low range)
    daily_range = current['high'] - current['low']
    if daily_range > 0:
        features['price_position'] = (current['close'] - current['low']) / daily_range
    else:
        features['price_position'] = 0.5

    # Replace NaN and inf values with appropriate defaults
    for key in features:
        if pd.isna(features[key]) or np.isinf(features[key]):
            features[key] = 0.0

    return features


def engineer_dataset(df: pd.DataFrame, look_forward: int = 1, spy_df: pd.DataFrame = None) -> Tuple[pd.DataFrame, pd.Series, List[str], pd.Series]:
    """
    Engineer complete dataset for ML training

    Args:
        df: Stock price data
        look_forward: Days ahead to predict
        spy_df: SPY (market) data for calculating beta and residual returns

    Returns:
        features_df: DataFrame with all features
        targets: Series with target RETURNS (not prices!)
        dates: List of dates
        prices: Series with current prices (for converting returns back to prices)
    """
    features_list = []
    returns_targets = []
    dates = []
    current_prices = []

    # Start from index 200 (need history for indicators)
    for i in range(200, len(df) - look_forward):
        try:
            # Extract SPY data up to same point for fair comparison
            spy_slice = None
            if spy_df is not None:
                spy_slice = spy_df.iloc[:i + 1] if i < len(spy_df) else spy_df

            feature_dict = extract_features(df, i, spy_df=spy_slice)
            features_list.append(feature_dict)

            # Target: RETURN (not absolute price!)
            current_price = df.iloc[i]['close']
            future_price = df.iloc[i + look_forward]['close']
            return_target = (future_price - current_price) / current_price

            returns_targets.append(return_target)
            current_prices.append(current_price)
            dates.append(df.iloc[i]['date'] if 'date' in df.columns else str(df.index[i]))
        except Exception as e:
            print(f"Error extracting features at index {i}: {e}")
            continue

    features_df = pd.DataFrame(features_list)
    returns_series = pd.Series(returns_targets)
    prices_series = pd.Series(current_prices)

    return features_df, returns_series, dates, prices_series


def normalize_features(features_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, float], Dict[str, float]]:
    """
    Normalize features using z-score normalization

    Returns:
        normalized_df: Normalized features
        means: Dictionary of feature means
        stds: Dictionary of feature standard deviations
    """
    # First, fill any remaining NaN or inf values
    features_df = features_df.replace([np.inf, -np.inf], np.nan)
    features_df = features_df.fillna(0)

    means = features_df.mean().to_dict()
    stds = features_df.std().to_dict()

    # Replace 0 std with 1 to avoid division by zero
    for key in stds:
        if stds[key] == 0 or pd.isna(stds[key]):
            stds[key] = 1.0
        if pd.isna(means[key]):
            means[key] = 0.0

    normalized_df = (features_df - features_df.mean()) / features_df.std().replace(0, 1)

    # Final safety check
    normalized_df = normalized_df.replace([np.inf, -np.inf], 0)
    normalized_df = normalized_df.fillna(0)

    return normalized_df, means, stds
