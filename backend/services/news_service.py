"""News service for fetching stock news"""
import httpx
from datetime import datetime, timedelta
from typing import List, Dict, Any
from config import settings
from utils.logger import logger


class NewsService:
    """Service for fetching stock news from Finnhub"""

    def __init__(self):
        self.api_key = settings.finnhub_api_key
        self.base_url = "https://finnhub.io/api/v1"

    async def get_news(self, symbol: str) -> List[Dict[str, Any]]:
        """
        Fetch news for a stock symbol

        Args:
            symbol: Stock ticker symbol

        Returns:
            List of news items
        """
        # If no API key, return demo data
        if not self.api_key:
            logger.warn("FINNHUB_API_KEY not configured, returning demo data")
            return self._get_demo_news(symbol)

        try:
            # Calculate date range (last 7 days)
            to_date = datetime.now().strftime('%Y-%m-%d')
            from_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

            # Fetch from Finnhub
            url = f"{self.base_url}/company-news"
            params = {
                "symbol": symbol,
                "from": from_date,
                "to": to_date,
                "token": self.api_key
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()

            # Transform Finnhub response to our format
            news = []
            for item in data[:10]:  # Limit to 10 items
                news.append({
                    "title": item.get("headline", ""),
                    "summary": item.get("summary", ""),
                    "source": item.get("source", ""),
                    "url": item.get("url", ""),
                    "publishedAt": datetime.fromtimestamp(item.get("datetime", 0)).isoformat(),
                    "sentiment": self._determine_sentiment(item.get("sentiment", 0)),
                    "image": item.get("image")
                })

            logger.info(f"News fetched for {symbol}", {"count": len(news)})
            return news

        except httpx.HTTPError as e:
            logger.error(f"Error fetching news for {symbol}", e)
            # Fall back to demo data on error
            return self._get_demo_news(symbol)
        except Exception as e:
            logger.error(f"Unexpected error fetching news for {symbol}", e)
            return self._get_demo_news(symbol)

    def _determine_sentiment(self, sentiment_score: float) -> str:
        """
        Determine sentiment from Finnhub sentiment score

        Args:
            sentiment_score: Sentiment score from Finnhub (typically -1 to 1)

        Returns:
            'positive', 'neutral', or 'negative'
        """
        if sentiment_score > 0.2:
            return "positive"
        elif sentiment_score < -0.2:
            return "negative"
        else:
            return "neutral"

    def _get_demo_news(self, symbol: str) -> List[Dict[str, Any]]:
        """
        Get demo news data when API key is not configured

        Args:
            symbol: Stock ticker symbol

        Returns:
            List of demo news items
        """
        now = datetime.now()
        return [
            {
                "title": f"{symbol} Reports Strong Quarterly Earnings",
                "summary": "Company beats analyst expectations with revenue growth of 15% year-over-year.",
                "source": "Financial Times",
                "url": "#",
                "publishedAt": (now - timedelta(hours=2)).isoformat(),
                "sentiment": "positive",
                "image": None
            },
            {
                "title": f"Analysts Upgrade {symbol} to 'Buy' Rating",
                "summary": "Major investment firms increase price targets following strong performance.",
                "source": "Bloomberg",
                "url": "#",
                "publishedAt": (now - timedelta(hours=5)).isoformat(),
                "sentiment": "positive",
                "image": None
            }
        ]
