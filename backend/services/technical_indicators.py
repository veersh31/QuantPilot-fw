"""Technical Indicators Service using TA-Lib"""
import talib
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
from utils.logger import logger


class TechnicalIndicatorService:
    """Service for calculating technical analysis indicators"""

    def calculate_all_indicators(self, symbol: str, historical_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate all technical indicators for a given stock

        Args:
            symbol: Stock ticker symbol
            historical_data: List of historical price data points

        Returns:
            Dictionary with all technical indicators and overall signal
        """
        try:
            if len(historical_data) < 200:
                logger.warn(f"Insufficient data for complete analysis of {symbol}", {
                    "data_points": len(historical_data)
                })

            # Extract OHLCV data as numpy arrays
            closes = np.array([float(d['close']) for d in historical_data])
            highs = np.array([float(d['high']) for d in historical_data])
            lows = np.array([float(d['low']) for d in historical_data])
            volumes = np.array([float(d['volume']) for d in historical_data])
            opens = np.array([float(d['open']) for d in historical_data])

            current_price = float(closes[-1])

            # Calculate all indicators
            rsi = self._calculate_rsi(closes, current_price)
            macd = self._calculate_macd(closes)
            bollinger_bands = self._calculate_bollinger_bands(closes, current_price)
            moving_averages = self._calculate_moving_averages(closes, current_price)
            stochastic = self._calculate_stochastic(highs, lows, closes)
            vwap = self._calculate_vwap(highs, lows, closes, volumes, current_price)
            adx = self._calculate_adx(highs, lows, closes)
            williams_r = self._calculate_williams_r(highs, lows, closes)
            cci = self._calculate_cci(highs, lows, closes)

            # Calculate overall signal
            overall_signal = self._calculate_overall_signal(
                rsi, macd, bollinger_bands, moving_averages,
                stochastic, adx, williams_r, cci, current_price
            )

            return {
                "symbol": symbol,
                "analysis": {
                    "rsi": rsi,
                    "macd": macd,
                    "bollingerBands": bollinger_bands,
                    "movingAverages": moving_averages,
                    "stochastic": stochastic,
                    "vwap": vwap,
                    "adx": adx,
                    "williamsR": williams_r,
                    "cci": cci,
                    "overallSignal": overall_signal,
                    "timestamp": datetime.now().isoformat()
                },
                "dataPoints": len(historical_data),
                "currentPrice": current_price
            }

        except Exception as e:
            logger.error(f"Error calculating indicators for {symbol}", e)
            raise

    def _calculate_rsi(self, closes: np.ndarray, current_price: float, period: int = 14) -> Dict[str, Any]:
        """Calculate RSI using Wilder's smoothing method"""
        rsi_values = talib.RSI(closes, timeperiod=period)
        rsi = float(rsi_values[-1]) if not np.isnan(rsi_values[-1]) else 50.0

        if rsi < 30:
            signal = "oversold"
            description = f"RSI at {rsi:.2f} indicates oversold conditions - potential buying opportunity"
        elif rsi > 70:
            signal = "overbought"
            description = f"RSI at {rsi:.2f} indicates overbought conditions - potential selling pressure"
        else:
            signal = "neutral"
            description = f"RSI at {rsi:.2f} is in neutral territory"

        return {
            "value": rsi,
            "signal": signal,
            "description": description
        }

    def _calculate_macd(self, closes: np.ndarray, fast: int = 12, slow: int = 26, signal_period: int = 9) -> Dict[str, Any]:
        """Calculate MACD with 12/26/9 periods"""
        macd, signal, histogram = talib.MACD(
            closes,
            fastperiod=fast,
            slowperiod=slow,
            signalperiod=signal_period
        )

        macd_val = float(macd[-1]) if not np.isnan(macd[-1]) else 0.0
        signal_val = float(signal[-1]) if not np.isnan(signal[-1]) else 0.0
        histogram_val = float(histogram[-1]) if not np.isnan(histogram[-1]) else 0.0

        if histogram_val > 0 and macd_val > signal_val:
            trend = "bullish"
            description = "MACD shows bullish momentum - upward trend likely"
        elif histogram_val < 0 and macd_val < signal_val:
            trend = "bearish"
            description = "MACD shows bearish momentum - downward pressure"
        else:
            trend = "neutral"
            description = "MACD is neutral - no clear directional bias"

        return {
            "macd": macd_val,
            "signal": signal_val,
            "histogram": histogram_val,
            "trend": trend,
            "description": description
        }

    def _calculate_bollinger_bands(self, closes: np.ndarray, current_price: float, period: int = 20, std_dev: int = 2) -> Dict[str, Any]:
        """Calculate Bollinger Bands with 2 standard deviations"""
        upper, middle, lower = talib.BBANDS(
            closes,
            timeperiod=period,
            nbdevup=std_dev,
            nbdevdn=std_dev,
            matype=0  # SMA
        )

        upper_val = float(upper[-1]) if not np.isnan(upper[-1]) else current_price
        middle_val = float(middle[-1]) if not np.isnan(middle[-1]) else current_price
        lower_val = float(lower[-1]) if not np.isnan(lower[-1]) else current_price
        bandwidth = ((upper_val - lower_val) / middle_val) * 100

        if current_price > upper_val:
            position = "above"
            description = f"Price is above upper band - potential overbought condition"
        elif current_price < lower_val:
            position = "below"
            description = f"Price is below lower band - potential oversold condition"
        else:
            position = "middle"
            description = f"Price is within the bands - normal volatility"

        return {
            "upper": upper_val,
            "middle": middle_val,
            "lower": lower_val,
            "bandwidth": bandwidth,
            "position": position,
            "description": description
        }

    def _calculate_moving_averages(self, closes: np.ndarray, current_price: float) -> Dict[str, Any]:
        """Calculate various moving averages"""
        sma20 = float(talib.SMA(closes, timeperiod=20)[-1]) if len(closes) >= 20 else current_price
        sma50 = float(talib.SMA(closes, timeperiod=50)[-1]) if len(closes) >= 50 else current_price
        sma200 = float(talib.SMA(closes, timeperiod=200)[-1]) if len(closes) >= 200 else current_price
        ema12 = float(talib.EMA(closes, timeperiod=12)[-1]) if len(closes) >= 12 else current_price
        ema26 = float(talib.EMA(closes, timeperiod=26)[-1]) if len(closes) >= 26 else current_price

        if current_price > sma200 and sma50 > sma200:
            trend = "bullish"
            description = "Price is above key moving averages - strong uptrend"
        elif current_price < sma200 and sma50 < sma200:
            trend = "bearish"
            description = "Price is below key moving averages - downtrend"
        else:
            trend = "neutral"
            description = "Mixed signals from moving averages"

        return {
            "sma20": sma20,
            "sma50": sma50,
            "sma200": sma200,
            "ema12": ema12,
            "ema26": ema26,
            "trend": trend,
            "description": description
        }

    def _calculate_stochastic(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> Dict[str, Any]:
        """Calculate Stochastic Oscillator"""
        slowk, slowd = talib.STOCH(
            highs, lows, closes,
            fastk_period=period,
            slowk_period=3,
            slowk_matype=0,
            slowd_period=3,
            slowd_matype=0
        )

        k_val = float(slowk[-1]) if not np.isnan(slowk[-1]) else 50.0
        d_val = float(slowd[-1]) if not np.isnan(slowd[-1]) else 50.0

        if k_val < 20:
            signal = "oversold"
            description = f"Stochastic at {k_val:.2f} - oversold condition"
        elif k_val > 80:
            signal = "overbought"
            description = f"Stochastic at {k_val:.2f} - overbought condition"
        else:
            signal = "neutral"
            description = f"Stochastic at {k_val:.2f} - neutral"

        return {
            "k": k_val,
            "d": d_val,
            "signal": signal,
            "description": description
        }

    def _calculate_vwap(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, volumes: np.ndarray, current_price: float) -> Dict[str, Any]:
        """Calculate Volume Weighted Average Price"""
        # VWAP approximation using typical price
        typical_price = (highs + lows + closes) / 3
        vwap_val = float(np.sum(typical_price * volumes) / np.sum(volumes))

        if current_price > vwap_val:
            position = "above"
            description = f"Price is above VWAP - bullish sentiment"
        else:
            position = "below"
            description = f"Price is below VWAP - bearish sentiment"

        return {
            "vwap": vwap_val,
            "position": position,
            "description": description
        }

    def _calculate_adx(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> Dict[str, Any]:
        """Calculate Average Directional Index"""
        adx = talib.ADX(highs, lows, closes, timeperiod=period)
        plus_di = talib.PLUS_DI(highs, lows, closes, timeperiod=period)
        minus_di = talib.MINUS_DI(highs, lows, closes, timeperiod=period)

        adx_val = float(adx[-1]) if not np.isnan(adx[-1]) else 0.0
        plus_di_val = float(plus_di[-1]) if not np.isnan(plus_di[-1]) else 0.0
        minus_di_val = float(minus_di[-1]) if not np.isnan(minus_di[-1]) else 0.0

        if adx_val > 50:
            if plus_di_val > minus_di_val:
                trend = "strong_uptrend"
                description = f"ADX at {adx_val:.2f} - very strong uptrend"
            else:
                trend = "strong_downtrend"
                description = f"ADX at {adx_val:.2f} - very strong downtrend"
        elif adx_val > 25:
            if plus_di_val > minus_di_val:
                trend = "uptrend"
                description = f"ADX at {adx_val:.2f} - trending up"
            else:
                trend = "downtrend"
                description = f"ADX at {adx_val:.2f} - trending down"
        else:
            trend = "no_trend"
            description = f"ADX at {adx_val:.2f} - weak or no trend"

        return {
            "adx": adx_val,
            "plusDI": plus_di_val,
            "minusDI": minus_di_val,
            "trend": trend,
            "description": description
        }

    def _calculate_williams_r(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 14) -> Dict[str, Any]:
        """Calculate Williams %R"""
        willr = talib.WILLR(highs, lows, closes, timeperiod=period)
        willr_val = float(willr[-1]) if not np.isnan(willr[-1]) else -50.0

        if willr_val < -80:
            signal = "oversold"
            description = f"Williams %R at {willr_val:.2f} - oversold"
        elif willr_val > -20:
            signal = "overbought"
            description = f"Williams %R at {willr_val:.2f} - overbought"
        else:
            signal = "neutral"
            description = f"Williams %R at {willr_val:.2f} - neutral"

        return {
            "value": willr_val,
            "signal": signal,
            "description": description
        }

    def _calculate_cci(self, highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, period: int = 20) -> Dict[str, Any]:
        """Calculate Commodity Channel Index"""
        cci = talib.CCI(highs, lows, closes, timeperiod=period)
        cci_val = float(cci[-1]) if not np.isnan(cci[-1]) else 0.0

        if cci_val < -100:
            signal = "oversold"
            description = f"CCI at {cci_val:.2f} - oversold condition"
        elif cci_val > 100:
            signal = "overbought"
            description = f"CCI at {cci_val:.2f} - overbought condition"
        else:
            signal = "neutral"
            description = f"CCI at {cci_val:.2f} - neutral"

        return {
            "value": cci_val,
            "signal": signal,
            "description": description
        }

    def _calculate_overall_signal(
        self, rsi: Dict, macd: Dict, bb: Dict, ma: Dict,
        stoch: Dict, adx: Dict, willr: Dict, cci: Dict,
        current_price: float
    ) -> str:
        """Calculate overall buy/sell signal based on all indicators"""
        bullish_signals = 0
        bearish_signals = 0

        # RSI
        if rsi['signal'] == 'oversold':
            bullish_signals += 1
        elif rsi['signal'] == 'overbought':
            bearish_signals += 1

        # MACD
        if macd['trend'] == 'bullish':
            bullish_signals += 1
        elif macd['trend'] == 'bearish':
            bearish_signals += 1

        # Bollinger Bands
        if bb['position'] == 'below':
            bullish_signals += 1
        elif bb['position'] == 'above':
            bearish_signals += 1

        # Moving Averages
        if ma['trend'] == 'bullish':
            bullish_signals += 1
        elif ma['trend'] == 'bearish':
            bearish_signals += 1

        # Stochastic
        if stoch['signal'] == 'oversold':
            bullish_signals += 1
        elif stoch['signal'] == 'overbought':
            bearish_signals += 1

        # ADX
        if adx['trend'] in ['uptrend', 'strong_uptrend']:
            bullish_signals += 1
        elif adx['trend'] in ['downtrend', 'strong_downtrend']:
            bearish_signals += 1

        # Williams %R
        if willr['signal'] == 'oversold':
            bullish_signals += 1
        elif willr['signal'] == 'overbought':
            bearish_signals += 1

        # CCI
        if cci['signal'] == 'oversold':
            bullish_signals += 1
        elif cci['signal'] == 'overbought':
            bearish_signals += 1

        # Determine overall signal
        if bullish_signals >= 6:
            return "strong_buy"
        elif bullish_signals >= 4:
            return "buy"
        elif bearish_signals >= 6:
            return "strong_sell"
        elif bearish_signals >= 4:
            return "sell"
        else:
            return "neutral"

    def calculate_signals(self, symbol: str, indicator_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate specific trading signals from indicator data

        Args:
            symbol: Stock ticker symbol
            indicator_data: Dictionary with indicator values

        Returns:
            List of trading signals
        """
        signals = []
        timestamp = datetime.now().isoformat()

        # RSI signals
        if 'rsi' in indicator_data:
            rsi = indicator_data['rsi']
            if rsi < 30:
                signals.append({
                    "type": "bullish",
                    "indicator": "RSI",
                    "signal": f"RSI oversold at {rsi:.2f}",
                    "confidence": 0.75,
                    "timestamp": timestamp
                })
            elif rsi > 70:
                signals.append({
                    "type": "bearish",
                    "indicator": "RSI",
                    "signal": f"RSI overbought at {rsi:.2f}",
                    "confidence": 0.75,
                    "timestamp": timestamp
                })

        # MACD signals
        if all(k in indicator_data for k in ['macd', 'signal', 'histogram']):
            macd = indicator_data['macd']
            signal = indicator_data['signal']
            histogram = indicator_data['histogram']

            if histogram > 0 and macd > signal:
                signals.append({
                    "type": "bullish",
                    "indicator": "MACD",
                    "signal": "MACD bullish crossover",
                    "confidence": 0.82,
                    "timestamp": timestamp
                })
            elif histogram < 0 and macd < signal:
                signals.append({
                    "type": "bearish",
                    "indicator": "MACD",
                    "signal": "MACD bearish crossover",
                    "confidence": 0.82,
                    "timestamp": timestamp
                })

        # Bollinger Bands signals
        if all(k in indicator_data for k in ['price', 'bollinger_upper', 'bollinger_lower']):
            price = indicator_data['price']
            upper = indicator_data['bollinger_upper']
            lower = indicator_data['bollinger_lower']

            if price > upper:
                signals.append({
                    "type": "warning",
                    "indicator": "Bollinger Bands",
                    "signal": "Price above upper band",
                    "confidence": 0.68,
                    "timestamp": timestamp
                })
            elif price < lower:
                signals.append({
                    "type": "bullish",
                    "indicator": "Bollinger Bands",
                    "signal": "Price below lower band - potential bounce",
                    "confidence": 0.72,
                    "timestamp": timestamp
                })

        return signals
