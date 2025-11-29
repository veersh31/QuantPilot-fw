"""Yahoo Finance service wrapper using yfinance"""
import yfinance as yf
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from utils.logger import logger


class YahooFinanceService:
    """Service for fetching stock data from Yahoo Finance"""

    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch real-time stock quote

        Args:
            symbol: Stock ticker symbol

        Returns:
            Dictionary with quote data matching frontend schema
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            # Get price data
            price = info.get('regularMarketPrice') or info.get('currentPrice') or 0
            change = info.get('regularMarketChange', 0)
            change_percent = info.get('regularMarketChangePercent', 0)

            # Detect if ETF or stock
            quote_type = info.get('quoteType', 'EQUITY')
            is_etf = quote_type == 'ETF'

            stock_data = {
                "symbol": symbol.upper(),
                "price": float(price),
                "change": round(float(change), 2),
                "changePercent": f"{change_percent:.2f}",
                "high52w": float(info.get('fiftyTwoWeekHigh', price)),
                "low52w": float(info.get('fiftyTwoWeekLow', price)),
                "marketCap": str(info.get('marketCap', 'N/A')),
                "pe": info.get('trailingPE'),
                "dividendYield": info.get('dividendYield', 0) * 100 if info.get('dividendYield') else 0,
                "volume": int(info.get('regularMarketVolume') or info.get('volume', 0)),
                "avgVolume": int(info.get('averageDailyVolume10Day') or info.get('averageVolume', 0)),
                "timestamp": datetime.now().isoformat(),
                "quoteType": quote_type,
                "isETF": is_etf
            }

            logger.stock_fetch(symbol, True)
            return stock_data

        except Exception as e:
            logger.stock_fetch(symbol, False)
            logger.error(f"Error fetching quote for {symbol}", e)
            raise

    async def get_historical(self, symbol: str, days: int = 30) -> Dict[str, Any]:
        """
        Fetch historical price data

        Args:
            symbol: Stock ticker symbol
            days: Number of days of historical data

        Returns:
            Dictionary with symbol and historical data array
        """
        try:
            ticker = yf.Ticker(symbol)

            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)

            # Fetch historical data
            hist = ticker.history(start=start_date, end=end_date, interval='1d')

            if hist.empty:
                raise ValueError(f"No historical data available for {symbol}")

            # Format data
            historical_data = []
            for date, row in hist.iterrows():
                historical_data.append({
                    "date": date.strftime('%Y-%m-%d'),
                    "open": float(row['Open']),
                    "close": float(row['Close']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "volume": int(row['Volume'])
                })

            logger.info(f"Historical data fetched for {symbol}", {"records": len(historical_data)})

            return {
                "symbol": symbol.upper(),
                "data": historical_data
            }

        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}", e)
            raise

    async def get_fundamentals(self, symbol: str) -> Dict[str, Any]:
        """
        Fetch fundamental data for stocks or ETFs

        Args:
            symbol: Stock ticker symbol

        Returns:
            Dictionary with fundamental data (stock or ETF)
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            quote_type = info.get('quoteType', 'EQUITY')
            is_etf = quote_type == 'ETF'

            # Common fields for both stocks and ETFs
            fundamentals = {
                "isETF": is_etf,
                "name": info.get('longName', info.get('shortName', symbol)),
                "description": info.get('longBusinessSummary'),
                "beta": info.get('beta'),
                "week52High": info.get('fiftyTwoWeekHigh'),
                "week52Low": info.get('fiftyTwoWeekLow'),
                "dividendYield": info.get('dividendYield', 0) * 100 if info.get('dividendYield') else None,
                "volume": info.get('volume'),
                "avgVolume": info.get('averageVolume')
            }

            if is_etf:
                # ETF-specific fields
                fundamentals.update({
                    "category": info.get('category'),
                    "fundFamily": info.get('fundFamily'),
                    "totalAssets": info.get('totalAssets'),
                    "expenseRatio": info.get('annualReportExpenseRatio', 0) * 100 if info.get('annualReportExpenseRatio') else None,
                    "ytdReturn": info.get('ytdReturn', 0) * 100 if info.get('ytdReturn') else None,
                    "threeYearReturn": info.get('threeYearAverageReturn', 0) * 100 if info.get('threeYearAverageReturn') else None,
                    "fiveYearReturn": info.get('fiveYearAverageReturn', 0) * 100 if info.get('fiveYearAverageReturn') else None,
                    "holdings": self._get_top_holdings(ticker),
                    "inceptionDate": info.get('fundInceptionDate')
                })
            else:
                # Stock-specific fields
                fundamentals.update({
                    "sector": info.get('sector'),
                    "industry": info.get('industry'),
                    "peRatio": info.get('trailingPE'),
                    "psRatio": info.get('priceToSalesTrailing12Months'),
                    "pbRatio": info.get('priceToBook'),
                    "eps": info.get('trailingEps'),
                    "roe": info.get('returnOnEquity', 0) * 100 if info.get('returnOnEquity') else None,
                    "operatingMargin": info.get('operatingMargins', 0) * 100 if info.get('operatingMargins') else None,
                    "profitMargin": info.get('profitMargins', 0) * 100 if info.get('profitMargins') else None,
                    "debtToEquity": info.get('debtToEquity'),
                    "currentRatio": info.get('currentRatio'),
                    "quickRatio": info.get('quickRatio'),
                    "revenueGrowth": info.get('revenueGrowth', 0) * 100 if info.get('revenueGrowth') else None,
                    "payoutRatio": info.get('payoutRatio', 0) * 100 if info.get('payoutRatio') else None,
                    "marketCap": info.get('marketCap'),
                    "bookValue": info.get('bookValue')
                })

            logger.info(f"Fundamentals fetched for {symbol}", {"type": "ETF" if is_etf else "Stock"})
            return fundamentals

        except Exception as e:
            logger.error(f"Error fetching fundamentals for {symbol}", e)
            raise

    def _get_top_holdings(self, ticker) -> Optional[List[Dict[str, Any]]]:
        """Get top holdings for ETF"""
        try:
            # yfinance doesn't provide holdings data directly
            # This would need to be enhanced with additional data sources
            return None
        except:
            return None

    async def search(self, query: str) -> List[Dict[str, str]]:
        """
        Search for stocks by query string

        Args:
            query: Search query (symbol or company name)

        Returns:
            List of search results
        """
        try:
            # Note: yfinance doesn't have a built-in search function
            # For a production app, you'd want to use Yahoo Finance API or maintain
            # a local database of symbols. For now, we'll try direct lookup.

            # Try to get ticker info for the query
            ticker = yf.Ticker(query.upper())
            info = ticker.info

            if info and 'symbol' in info:
                return [{
                    "symbol": info.get('symbol', query.upper()),
                    "name": info.get('longName', info.get('shortName', '')),
                    "type": info.get('quoteType', 'EQUITY'),
                    "exchange": info.get('exchange', '')
                }]
            else:
                return []

        except Exception as e:
            logger.warn(f"Search failed for query: {query}", {"error": str(e)})
            return []
