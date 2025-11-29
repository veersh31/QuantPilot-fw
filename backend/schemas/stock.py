"""Pydantic schemas for stock-related endpoints"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


# ===== Quote Endpoint =====
class QuoteRequest(BaseModel):
    """Request schema for stock quote"""
    symbol: str


class QuoteResponse(BaseModel):
    """Response schema for stock quote with camelCase aliases"""
    symbol: str
    price: float
    change: float
    change_percent: str = Field(..., alias="changePercent")
    high52w: float = Field(..., alias="high52w")
    low52w: float = Field(..., alias="low52w")
    market_cap: str = Field(..., alias="marketCap")
    pe: Optional[float] = None
    dividend_yield: Optional[float] = Field(None, alias="dividendYield")
    volume: int
    avg_volume: int = Field(..., alias="avgVolume")
    timestamp: str
    quote_type: str = Field(..., alias="quoteType")
    is_etf: bool = Field(..., alias="isETF")

    class Config:
        populate_by_name = True


# ===== Historical Data Endpoint =====
class HistoricalRequest(BaseModel):
    """Request schema for historical data"""
    symbol: str
    days: int = 30


class HistoricalDataPoint(BaseModel):
    """Single historical data point"""
    date: str  # YYYY-MM-DD format
    open: float
    close: float
    high: float
    low: float
    volume: int


class HistoricalResponse(BaseModel):
    """Response schema for historical data"""
    symbol: str
    data: List[HistoricalDataPoint]


# ===== Fundamentals Endpoint =====
class FundamentalsRequest(BaseModel):
    """Request schema for fundamentals"""
    symbol: str


class Holding(BaseModel):
    """Holding information for ETFs"""
    symbol: str
    name: str
    percent: Optional[float] = None


class FundamentalsResponse(BaseModel):
    """Response schema for fundamentals (Stock or ETF)"""
    is_etf: bool = Field(..., alias="isETF")
    name: str
    description: Optional[str] = None
    beta: Optional[float] = None
    week52_high: Optional[float] = Field(None, alias="week52High")
    week52_low: Optional[float] = Field(None, alias="week52Low")
    dividend_yield: Optional[float] = Field(None, alias="dividendYield")
    volume: Optional[int] = None
    avg_volume: Optional[int] = Field(None, alias="avgVolume")

    # ETF-specific fields
    category: Optional[str] = None
    fund_family: Optional[str] = Field(None, alias="fundFamily")
    total_assets: Optional[float] = Field(None, alias="totalAssets")
    expense_ratio: Optional[float] = Field(None, alias="expenseRatio")
    ytd_return: Optional[float] = Field(None, alias="ytdReturn")
    three_year_return: Optional[float] = Field(None, alias="threeYearReturn")
    five_year_return: Optional[float] = Field(None, alias="fiveYearReturn")
    holdings: Optional[List[Holding]] = None
    inception_date: Optional[str] = Field(None, alias="inceptionDate")

    # Stock-specific fields
    sector: Optional[str] = None
    industry: Optional[str] = None
    pe_ratio: Optional[float] = Field(None, alias="peRatio")
    ps_ratio: Optional[float] = Field(None, alias="psRatio")
    pb_ratio: Optional[float] = Field(None, alias="pbRatio")
    eps: Optional[float] = None
    roe: Optional[float] = None
    operating_margin: Optional[float] = Field(None, alias="operatingMargin")
    profit_margin: Optional[float] = Field(None, alias="profitMargin")
    debt_to_equity: Optional[float] = Field(None, alias="debtToEquity")
    current_ratio: Optional[float] = Field(None, alias="currentRatio")
    quick_ratio: Optional[float] = Field(None, alias="quickRatio")
    revenue_growth: Optional[float] = Field(None, alias="revenueGrowth")
    payout_ratio: Optional[float] = Field(None, alias="payoutRatio")
    market_cap: Optional[float] = Field(None, alias="marketCap")
    book_value: Optional[float] = Field(None, alias="bookValue")

    class Config:
        populate_by_name = True


# ===== News Endpoint =====
class NewsRequest(BaseModel):
    """Request schema for news"""
    symbol: str


class NewsItem(BaseModel):
    """Single news item"""
    title: str
    summary: str
    source: str
    url: str
    published_at: str = Field(..., alias="publishedAt")
    sentiment: str  # 'positive' | 'neutral' | 'negative'
    image: Optional[str] = None

    class Config:
        populate_by_name = True


class NewsResponse(BaseModel):
    """Response schema for news"""
    news: List[NewsItem]


# ===== Search Endpoint =====
class SearchRequest(BaseModel):
    """Request schema for stock search"""
    query: str


class SearchResult(BaseModel):
    """Single search result"""
    symbol: str
    name: str
    type: str  # 'EQUITY' | 'ETF' | 'MUTUALFUND'
    exchange: str


class SearchResponse(BaseModel):
    """Response schema for stock search"""
    results: List[SearchResult]


# ===== Recommendations Endpoint =====
class PortfolioHolding(BaseModel):
    """Single portfolio holding"""
    symbol: str
    price: float
    quantity: int
    dividend: Optional[float] = None


class RecommendationsRequest(BaseModel):
    """Request schema for portfolio recommendations"""
    portfolio: List[PortfolioHolding]
    metrics: Optional[dict] = None
    selected_stock: Optional[str] = Field(None, alias="selectedStock")

    class Config:
        populate_by_name = True


class Recommendation(BaseModel):
    """Single recommendation"""
    type: str  # 'rebalance' | 'diversify' | 'review' | 'tax' | 'dividend'
    title: str
    description: str
    action: str
    priority: str  # 'high' | 'medium' | 'low'


class RecommendationsResponse(BaseModel):
    """Response schema for recommendations"""
    recommendations: List[Recommendation]
