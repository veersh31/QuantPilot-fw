"""
Stock Data Fetching Module
Handles all external data retrieval from Yahoo Finance
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import time
from functools import lru_cache


class StockDataFetcher:
    """Handles all stock data fetching operations"""

    def __init__(self, cache_ttl: int = 300):
        """
        Initialize the stock data fetcher

        Args:
            cache_ttl: Cache time-to-live in seconds (default 5 minutes)
        """
        self.cache_ttl = cache_ttl

    def fetch_historical_data(
        self,
        symbol: str,
        days: int = 730,
        max_retries: int = 3
    ) -> pd.DataFrame:
        """
        Fetch historical OHLCV data for a symbol

        Args:
            symbol: Stock/ETF ticker symbol
            days: Number of days of historical data (default 730 = 2 years)
            max_retries: Maximum number of retry attempts

        Returns:
            DataFrame with columns: date, open, high, low, close, volume

        Raises:
            ValueError: If no data is available or insufficient data
        """
        symbol = symbol.upper()
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        print(f"[StockDataFetcher] Fetching {days} days of data for {symbol}")

        df = None
        for attempt in range(max_retries):
            try:
                # Try yf.download first (more reliable)
                df = yf.download(
                    symbol,
                    start=start_date,
                    end=end_date,
                    progress=False
                )

                if not df.empty:
                    print(f"   ✓ Downloaded {len(df)} data points")
                    break

                # Fallback to Ticker method
                print(f"   ⚠ Download returned no data, trying Ticker method...")
                ticker = yf.Ticker(symbol)
                df = ticker.history(start=start_date, end=end_date)

                if not df.empty:
                    print(f"   ✓ Fetched {len(df)} data points via Ticker")
                    break

                print(f"   ⚠ Attempt {attempt + 1}/{max_retries} failed, retrying...")
                time.sleep(2 ** attempt)

            except Exception as e:
                print(f"   ⚠ Error on attempt {attempt + 1}/{max_retries}: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                else:
                    raise ValueError(f"Failed to fetch data for {symbol} after {max_retries} attempts: {str(e)}")

        if df is None or df.empty:
            raise ValueError(f"No data available for {symbol}")

        # Standardize DataFrame format
        df = self._standardize_dataframe(df)

        return df

    def _standardize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize DataFrame format to consistent column names

        Args:
            df: Raw DataFrame from yfinance

        Returns:
            Standardized DataFrame with lowercase column names
        """
        df = df.reset_index()

        # Handle MultiIndex columns from yf.download
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0].lower() if isinstance(col, tuple) else col.lower() for col in df.columns]
        else:
            df.columns = [col.lower() if isinstance(col, str) else col for col in df.columns]

        # Ensure date column exists
        if 'date' not in df.columns and df.index.name == 'Date':
            df = df.reset_index()
            df.columns = [col.lower() for col in df.columns]

        # Format date as string
        df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

        # Ensure required columns exist
        required = ['date', 'open', 'high', 'low', 'close', 'volume']
        for col in required:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")

        return df[required]

    def fetch_quote(self, symbol: str) -> Dict:
        """
        Fetch current quote data for a symbol

        Args:
            symbol: Stock/ETF ticker symbol

        Returns:
            Dictionary with current price and market data
        """
        symbol = symbol.upper()
        print(f"[StockDataFetcher] Fetching quote for {symbol}")

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            # Extract quote data from info
            current_price = float(info.get('currentPrice') or info.get('regularMarketPrice', 0))
            prev_close = float(info.get('previousClose') or info.get('regularMarketPreviousClose', 0))

            # Calculate change
            change = current_price - prev_close if prev_close > 0 else 0
            change_percent = (change / prev_close * 100) if prev_close > 0 else 0

            quote_type = info.get('quoteType', 'EQUITY')

            print(f"   ✓ Got quote: ${current_price:.2f} ({change_percent:+.2f}%)")

            return {
                'symbol': symbol,
                'price': current_price,
                'change': change,
                'changePercent': change_percent,
                'high52w': float(info.get('fiftyTwoWeekHigh', current_price)),
                'low52w': float(info.get('fiftyTwoWeekLow', current_price)),
                'marketCap': str(info.get('marketCap', 'N/A')),
                'pe': float(info.get('trailingPE', 0)) if info.get('trailingPE') else 0,
                'dividendYield': float(info.get('dividendYield', 0)) * 100 if info.get('dividendYield') else 0,
                'volume': int(info.get('regularMarketVolume', 0)) if info.get('regularMarketVolume') else 0,
                'avgVolume': int(info.get('averageDailyVolume3Month', 0)) if info.get('averageDailyVolume3Month') else 0,
                'quoteType': quote_type,
                'isETF': quote_type == 'ETF',
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            raise ValueError(f"Failed to fetch quote for {symbol}: {str(e)}")

    def fetch_fundamentals(self, symbol: str) -> Dict:
        """
        Fetch fundamental data for a stock or ETF

        Args:
            symbol: Stock/ETF ticker symbol

        Returns:
            Dictionary with fundamental metrics
        """
        symbol = symbol.upper()
        print(f"[StockDataFetcher] Fetching fundamentals for {symbol}")

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            quote_type = info.get('quoteType', 'EQUITY')
            is_etf = quote_type == 'ETF'

            if is_etf:
                # ETF-specific metrics
                return {
                    'symbol': symbol,
                    'type': 'ETF',
                    'name': info.get('longName', symbol),
                    'expenseRatio': info.get('annualReportExpenseRatio', 0),
                    'ytdReturn': info.get('ytdReturn', 0),
                    'threeYearReturn': info.get('threeYearAverageReturn', 0),
                    'fiveYearReturn': info.get('fiveYearAverageReturn', 0),
                    'totalAssets': info.get('totalAssets', 0),
                    'category': info.get('category', 'N/A'),
                    'fundFamily': info.get('fundFamily', 'N/A'),
                    'inceptionDate': info.get('fundInceptionDate', 'N/A'),
                    'holdings': info.get('holdings', [])[:10],  # Top 10 holdings
                    'timestamp': datetime.now().isoformat()
                }
            else:
                # Stock-specific metrics
                return {
                    'symbol': symbol,
                    'type': 'STOCK',
                    'name': info.get('longName', symbol),
                    'sector': info.get('sector', 'N/A'),
                    'industry': info.get('industry', 'N/A'),
                    'marketCap': info.get('marketCap', 0),
                    'pe': info.get('trailingPE', 0),
                    'forwardPE': info.get('forwardPE', 0),
                    'peg': info.get('pegRatio', 0),
                    'ps': info.get('priceToSalesTrailing12Months', 0),
                    'pb': info.get('priceToBook', 0),
                    'eps': info.get('trailingEps', 0),
                    'roe': info.get('returnOnEquity', 0),
                    'roic': info.get('returnOnAssets', 0),  # Using ROA as proxy
                    'profitMargin': info.get('profitMargins', 0),
                    'operatingMargin': info.get('operatingMargins', 0),
                    'debtToEquity': info.get('debtToEquity', 0),
                    'currentRatio': info.get('currentRatio', 0),
                    'quickRatio': info.get('quickRatio', 0),
                    'revenueGrowth': info.get('revenueGrowth', 0),
                    'earningsGrowth': info.get('earningsGrowth', 0),
                    'dividendYield': info.get('dividendYield', 0),
                    'payoutRatio': info.get('payoutRatio', 0),
                    'bookValue': info.get('bookValue', 0),
                    'beta': info.get('beta', 1.0),
                    'timestamp': datetime.now().isoformat()
                }

        except Exception as e:
            raise ValueError(f"Failed to fetch fundamentals for {symbol}: {str(e)}")
