"""
Technical Indicators Module
Comprehensive technical analysis calculations
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any


class TechnicalIndicators:
    """Calculate all technical indicators for stock analysis"""

    @staticmethod
    def calculate_all(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculate comprehensive technical analysis

        Args:
            df: DataFrame with OHLCV data

        Returns:
            Dictionary with all technical indicators and overall signal
        """
        close_prices = df['close'].values
        high_prices = df['high'].values
        low_prices = df['low'].values
        volume = df['volume'].values

        indicators = {
            'rsi': TechnicalIndicators.calculate_rsi(close_prices),
            'macd': TechnicalIndicators.calculate_macd(close_prices),
            'bollingerBands': TechnicalIndicators.calculate_bollinger_bands(close_prices),
            'movingAverages': TechnicalIndicators.calculate_moving_averages(close_prices),
            'stochastic': TechnicalIndicators.calculate_stochastic(df),
            'vwap': TechnicalIndicators.calculate_vwap(df),
            'adx': TechnicalIndicators.calculate_adx(df),
            'williamsR': TechnicalIndicators.calculate_williams_r(df),
            'cci': TechnicalIndicators.calculate_cci(df),
        }

        # Calculate overall signal
        indicators['overallSignal'] = TechnicalIndicators._calculate_overall_signal(indicators)
        indicators['timestamp'] = pd.Timestamp.now().isoformat()

        return indicators

    @staticmethod
    def calculate_rsi(prices: np.ndarray, period: int = 14) -> Dict[str, Any]:
        """Calculate RSI using Wilder's smoothing method"""
        if len(prices) < period + 1:
            return {'value': 50.0, 'signal': 'neutral', 'description': 'Insufficient data for RSI'}

        # Calculate price changes
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        # Wilder's smoothing
        avg_gain = np.mean(gains[:period])
        avg_loss = np.mean(losses[:period])

        for i in range(period, len(gains)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period

        rs = avg_gain / avg_loss if avg_loss != 0 else 100
        rsi = 100 - (100 / (1 + rs))

        # Determine signal
        if rsi < 30:
            signal = 'oversold'
            description = f'RSI at {rsi:.2f} indicates oversold conditions - potential buying opportunity'
        elif rsi > 70:
            signal = 'overbought'
            description = f'RSI at {rsi:.2f} indicates overbought conditions - potential selling pressure'
        else:
            signal = 'neutral'
            description = f'RSI at {rsi:.2f} is in neutral territory'

        return {'value': float(rsi), 'signal': signal, 'description': description}

    @staticmethod
    def calculate_macd(prices: np.ndarray, fast: int = 12, slow: int = 26, signal_period: int = 9) -> Dict[str, Any]:
        """Calculate MACD indicator"""
        if len(prices) < slow + signal_period:
            return {
                'macd': 0.0, 'signal': 0.0, 'histogram': 0.0,
                'trend': 'neutral', 'description': 'Insufficient data for MACD'
            }

        prices_series = pd.Series(prices)

        # Calculate EMAs
        ema_fast = prices_series.ewm(span=fast, adjust=False).mean()
        ema_slow = prices_series.ewm(span=slow, adjust=False).mean()

        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
        histogram = macd_line - signal_line

        macd_val = float(macd_line.iloc[-1])
        signal_val = float(signal_line.iloc[-1])
        hist_val = float(histogram.iloc[-1])

        # Determine trend
        if hist_val > 0 and macd_val > signal_val:
            trend = 'bullish'
            description = f'MACD ({macd_val:.2f}) is above signal line - bullish momentum'
        elif hist_val < 0 and macd_val < signal_val:
            trend = 'bearish'
            description = f'MACD ({macd_val:.2f}) is below signal line - bearish momentum'
        else:
            trend = 'neutral'
            description = 'MACD shows neutral momentum'

        return {
            'macd': macd_val,
            'signal': signal_val,
            'histogram': hist_val,
            'trend': trend,
            'description': description
        }

    @staticmethod
    def calculate_bollinger_bands(prices: np.ndarray, period: int = 20, num_std: int = 2) -> Dict[str, Any]:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            current = prices[-1] if len(prices) > 0 else 0
            return {
                'upper': current, 'middle': current, 'lower': current,
                'bandwidth': 0.0, 'position': 'middle',
                'description': 'Insufficient data for Bollinger Bands'
            }

        prices_series = pd.Series(prices)
        sma = prices_series.rolling(window=period).mean()
        std = prices_series.rolling(window=period).std()

        upper = sma + (std * num_std)
        lower = sma - (std * num_std)

        current_price = prices[-1]
        upper_val = float(upper.iloc[-1])
        middle_val = float(sma.iloc[-1])
        lower_val = float(lower.iloc[-1])
        bandwidth = ((upper_val - lower_val) / middle_val) * 100 if middle_val > 0 else 0

        # Determine position
        if current_price > upper_val:
            position = 'above'
            description = f'Price ({current_price:.2f}) is above upper band ({upper_val:.2f}) - potentially overbought'
        elif current_price < lower_val:
            position = 'below'
            description = f'Price ({current_price:.2f}) is below lower band ({lower_val:.2f}) - potentially oversold'
        else:
            position = 'middle'
            description = f'Price ({current_price:.2f}) is within bands - normal volatility'

        return {
            'upper': upper_val,
            'middle': middle_val,
            'lower': lower_val,
            'bandwidth': float(bandwidth),
            'position': position,
            'description': description
        }

    @staticmethod
    def calculate_moving_averages(prices: np.ndarray) -> Dict[str, Any]:
        """Calculate moving averages and trends"""
        prices_series = pd.Series(prices)

        sma20 = float(prices_series.rolling(window=20).mean().iloc[-1]) if len(prices) >= 20 else 0
        sma50 = float(prices_series.rolling(window=50).mean().iloc[-1]) if len(prices) >= 50 else 0
        sma200 = float(prices_series.rolling(window=200).mean().iloc[-1]) if len(prices) >= 200 else 0
        ema12 = float(prices_series.ewm(span=12, adjust=False).mean().iloc[-1]) if len(prices) >= 12 else 0
        ema26 = float(prices_series.ewm(span=26, adjust=False).mean().iloc[-1]) if len(prices) >= 26 else 0

        current_price = prices[-1]

        # Determine trend
        if sma20 > sma50 and (sma200 == 0 or sma50 > sma200) and current_price > sma20:
            trend = 'bullish'
            description = 'Price above short-term MAs in bullish alignment'
        elif sma20 < sma50 and (sma200 == 0 or sma50 < sma200) and current_price < sma20:
            trend = 'bearish'
            description = 'Price below short-term MAs in bearish alignment'
        else:
            trend = 'neutral'
            description = 'Moving averages show mixed signals'

        return {
            'sma20': sma20,
            'sma50': sma50,
            'sma200': sma200,
            'ema12': ema12,
            'ema26': ema26,
            'trend': trend,
            'description': description
        }

    @staticmethod
    def calculate_stochastic(df: pd.DataFrame, k_period: int = 14, d_period: int = 3) -> Dict[str, Any]:
        """Calculate Stochastic Oscillator"""
        if len(df) < k_period:
            return {'k': 50.0, 'd': 50.0, 'signal': 'neutral', 'description': 'Insufficient data for Stochastic'}

        low_min = df['low'].rolling(window=k_period).min()
        high_max = df['high'].rolling(window=k_period).max()

        k = 100 * (df['close'] - low_min) / (high_max - low_min)
        d = k.rolling(window=d_period).mean()

        k_val = float(k.iloc[-1]) if not pd.isna(k.iloc[-1]) else 50.0
        d_val = float(d.iloc[-1]) if not pd.isna(d.iloc[-1]) else 50.0

        # Determine signal
        if k_val < 20:
            signal = 'oversold'
            description = f'Stochastic %K at {k_val:.2f} indicates oversold conditions'
        elif k_val > 80:
            signal = 'overbought'
            description = f'Stochastic %K at {k_val:.2f} indicates overbought conditions'
        else:
            signal = 'neutral'
            description = f'Stochastic in neutral range at {k_val:.2f}'

        return {'k': k_val, 'd': d_val, 'signal': signal, 'description': description}

    @staticmethod
    def calculate_vwap(df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate VWAP"""
        if len(df) == 0:
            return {'vwap': 0.0, 'position': 'below', 'description': 'Insufficient data for VWAP'}

        typical_price = (df['high'] + df['low'] + df['close']) / 3
        vwap = (typical_price * df['volume']).sum() / df['volume'].sum() if df['volume'].sum() > 0 else 0

        current_price = df['close'].iloc[-1]
        position = 'above' if current_price > vwap else 'below'

        description = (
            f'Price ({current_price:.2f}) is {position} VWAP ({vwap:.2f}) - '
            f'{"bullish" if position == "above" else "bearish"} signal'
        )

        return {'vwap': float(vwap), 'position': position, 'description': description}

    @staticmethod
    def calculate_adx(df: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
        """Calculate ADX"""
        if len(df) < period + 1:
            return {
                'adx': 0.0, 'plusDI': 0.0, 'minusDI': 0.0,
                'trend': 'no_trend', 'description': 'Insufficient data for ADX'
            }

        # Calculate True Range and Directional Movement
        high = df['high'].values
        low = df['low'].values
        close = df['close'].values

        tr = np.maximum(
            high[1:] - low[1:],
            np.maximum(
                np.abs(high[1:] - close[:-1]),
                np.abs(low[1:] - close[:-1])
            )
        )

        plus_dm = np.where((high[1:] - high[:-1]) > (low[:-1] - low[1:]), np.maximum(high[1:] - high[:-1], 0), 0)
        minus_dm = np.where((low[:-1] - low[1:]) > (high[1:] - high[:-1]), np.maximum(low[:-1] - low[1:], 0), 0)

        # Smooth TR, +DM, -DM
        smooth_tr = np.sum(tr[:period])
        smooth_plus_dm = np.sum(plus_dm[:period])
        smooth_minus_dm = np.sum(minus_dm[:period])

        for i in range(period, len(tr)):
            smooth_tr = smooth_tr - smooth_tr / period + tr[i]
            smooth_plus_dm = smooth_plus_dm - smooth_plus_dm / period + plus_dm[i]
            smooth_minus_dm = smooth_minus_dm - smooth_minus_dm / period + minus_dm[i]

        # Calculate DI+ and DI-
        plus_di = (smooth_plus_dm / smooth_tr) * 100 if smooth_tr > 0 else 0
        minus_di = (smooth_minus_dm / smooth_tr) * 100 if smooth_tr > 0 else 0

        # Calculate DX and ADX
        dx = (abs(plus_di - minus_di) / (plus_di + minus_di)) * 100 if (plus_di + minus_di) > 0 else 0
        adx = dx  # Simplified

        # Determine trend
        if adx < 20:
            trend = 'no_trend'
        elif plus_di > minus_di:
            trend = 'strong_uptrend' if adx > 40 else 'uptrend'
        else:
            trend = 'strong_downtrend' if adx > 40 else 'downtrend'

        description = f'ADX: {adx:.1f} - {trend.replace("_", " ")}'

        return {
            'adx': float(adx),
            'plusDI': float(plus_di),
            'minusDI': float(minus_di),
            'trend': trend,
            'description': description
        }

    @staticmethod
    def calculate_williams_r(df: pd.DataFrame, period: int = 14) -> Dict[str, Any]:
        """Calculate Williams %R"""
        if len(df) < period:
            return {'value': -50.0, 'signal': 'neutral', 'description': 'Insufficient data for Williams %R'}

        recent_df = df.iloc[-period:]
        highest_high = recent_df['high'].max()
        lowest_low = recent_df['low'].min()
        current_close = df['close'].iloc[-1]

        williams_r = ((highest_high - current_close) / (highest_high - lowest_low)) * -100 if (highest_high - lowest_low) > 0 else -50

        # Determine signal
        if williams_r < -80:
            signal = 'oversold'
            description = f'Williams %R at {williams_r:.2f} indicates oversold conditions'
        elif williams_r > -20:
            signal = 'overbought'
            description = f'Williams %R at {williams_r:.2f} indicates overbought conditions'
        else:
            signal = 'neutral'
            description = f'Williams %R at {williams_r:.2f} is in neutral territory'

        return {'value': float(williams_r), 'signal': signal, 'description': description}

    @staticmethod
    def calculate_cci(df: pd.DataFrame, period: int = 20) -> Dict[str, Any]:
        """Calculate CCI (Commodity Channel Index)"""
        if len(df) < period:
            return {'value': 0.0, 'signal': 'neutral', 'description': 'Insufficient data for CCI'}

        typical_price = (df['high'] + df['low'] + df['close']) / 3
        sma_tp = typical_price.rolling(window=period).mean()
        mean_deviation = typical_price.rolling(window=period).apply(lambda x: np.mean(np.abs(x - x.mean())))

        current_tp = typical_price.iloc[-1]
        current_sma = sma_tp.iloc[-1]
        current_md = mean_deviation.iloc[-1]

        cci = (current_tp - current_sma) / (0.015 * current_md) if current_md > 0 else 0

        # Determine signal
        if cci < -100:
            signal = 'oversold'
            description = f'CCI at {cci:.2f} indicates oversold conditions'
        elif cci > 100:
            signal = 'overbought'
            description = f'CCI at {cci:.2f} indicates overbought conditions'
        else:
            signal = 'neutral'
            description = f'CCI at {cci:.2f} is in neutral range'

        return {'value': float(cci), 'signal': signal, 'description': description}

    @staticmethod
    def _calculate_overall_signal(indicators: Dict) -> str:
        """Calculate overall trading signal from all indicators"""
        bullish_signals = 0
        bearish_signals = 0

        # RSI
        if indicators['rsi']['signal'] == 'oversold':
            bullish_signals += 1
        elif indicators['rsi']['signal'] == 'overbought':
            bearish_signals += 1

        # MACD
        if indicators['macd']['trend'] == 'bullish':
            bullish_signals += 1
        elif indicators['macd']['trend'] == 'bearish':
            bearish_signals += 1

        # Bollinger Bands
        if indicators['bollingerBands']['position'] == 'below':
            bullish_signals += 1
        elif indicators['bollingerBands']['position'] == 'above':
            bearish_signals += 1

        # Moving Averages
        if indicators['movingAverages']['trend'] == 'bullish':
            bullish_signals += 1
        elif indicators['movingAverages']['trend'] == 'bearish':
            bearish_signals += 1

        # Stochastic
        if indicators['stochastic']['signal'] == 'oversold':
            bullish_signals += 1
        elif indicators['stochastic']['signal'] == 'overbought':
            bearish_signals += 1

        # VWAP
        if indicators['vwap']['position'] == 'above':
            bullish_signals += 1
        elif indicators['vwap']['position'] == 'below':
            bearish_signals += 1

        # ADX
        if indicators['adx']['trend'] in ['strong_uptrend', 'uptrend']:
            bullish_signals += 1
        elif indicators['adx']['trend'] in ['strong_downtrend', 'downtrend']:
            bearish_signals += 1

        # Williams %R
        if indicators['williamsR']['signal'] == 'oversold':
            bullish_signals += 1
        elif indicators['williamsR']['signal'] == 'overbought':
            bearish_signals += 1

        # CCI
        if indicators['cci']['signal'] == 'oversold':
            bullish_signals += 1
        elif indicators['cci']['signal'] == 'overbought':
            bearish_signals += 1

        # Determine overall signal
        if bullish_signals >= 6:
            return 'strong_buy'
        elif bullish_signals >= 4:
            return 'buy'
        elif bearish_signals >= 6:
            return 'strong_sell'
        elif bearish_signals >= 4:
            return 'sell'
        else:
            return 'neutral'
