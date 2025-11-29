"""Stock-related API endpoints"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from schemas.stock import (
    QuoteRequest, QuoteResponse,
    HistoricalRequest, HistoricalResponse,
    FundamentalsRequest, FundamentalsResponse,
    NewsRequest, NewsResponse,
    SearchRequest, SearchResponse,
    RecommendationsRequest, RecommendationsResponse, Recommendation
)
from services.yahoo_finance import YahooFinanceService
from services.news_service import NewsService
from utils.cache import cache_headers
from utils.logger import logger

router = APIRouter()
yf_service = YahooFinanceService()
news_service = NewsService()


@router.post("/quote", response_model=QuoteResponse)
async def get_quote(request: QuoteRequest):
    """Get real-time stock quote"""
    try:
        logger.api_request('POST', '/stocks/quote', {"symbol": request.symbol})

        data = await yf_service.get_quote(request.symbol)

        logger.api_response('POST', '/stocks/quote', 200)
        return JSONResponse(
            content=data,
            headers=cache_headers(60)  # 60s cache
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.api_error('POST', '/stocks/quote', e)
        raise HTTPException(status_code=500, detail="Failed to fetch stock quote")


@router.post("/historical", response_model=HistoricalResponse)
async def get_historical(request: HistoricalRequest):
    """Get historical price data"""
    try:
        logger.api_request('POST', '/stocks/historical', {
            "symbol": request.symbol,
            "days": request.days
        })

        data = await yf_service.get_historical(request.symbol, request.days)

        logger.api_response('POST', '/stocks/historical', 200)
        return JSONResponse(content=data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.api_error('POST', '/stocks/historical', e)
        raise HTTPException(status_code=500, detail="Failed to fetch historical data")


@router.get("/fundamentals", response_model=FundamentalsResponse)
async def get_fundamentals(symbol: str):
    """Get fundamental data (stock or ETF)"""
    try:
        logger.api_request('GET', '/stocks/fundamentals', {"symbol": symbol})

        data = await yf_service.get_fundamentals(symbol)

        logger.api_response('GET', '/stocks/fundamentals', 200)
        return JSONResponse(
            content=data,
            headers=cache_headers(3600)  # 1 hour cache
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.api_error('GET', '/stocks/fundamentals', e)
        raise HTTPException(status_code=500, detail="Failed to fetch fundamentals")


@router.post("/search", response_model=SearchResponse)
async def search_stocks(request: SearchRequest):
    """Search for stocks by query"""
    try:
        if not request.query or len(request.query.strip()) == 0:
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        logger.api_request('POST', '/stocks/search', {"query": request.query})

        results = await yf_service.search(request.query)

        logger.api_response('POST', '/stocks/search', 200)
        return JSONResponse(content={"results": results})
    except HTTPException:
        raise
    except Exception as e:
        logger.api_error('POST', '/stocks/search', e)
        raise HTTPException(status_code=500, detail="Search failed")


@router.post("/news", response_model=NewsResponse)
async def get_news(request: NewsRequest):
    """Get news for a stock"""
    try:
        logger.api_request('POST', '/stocks/news', {"symbol": request.symbol})

        news = await news_service.get_news(request.symbol)

        logger.api_response('POST', '/stocks/news', 200)
        return JSONResponse(content={"news": news})
    except Exception as e:
        logger.api_error('POST', '/stocks/news', e)
        raise HTTPException(status_code=500, detail="Failed to fetch news")


@router.post("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(request: RecommendationsRequest):
    """Get portfolio recommendations"""
    try:
        logger.api_request('POST', '/stocks/recommendations', {
            "portfolio_size": len(request.portfolio)
        })

        recommendations = []

        # Calculate total portfolio value
        total_value = sum(holding.price * holding.quantity for holding in request.portfolio)

        # Check for concentration risk (positions > 40% or < 5%)
        for holding in request.portfolio:
            position_value = holding.price * holding.quantity
            allocation = (position_value / total_value) * 100

            if allocation > 40:
                recommendations.append(Recommendation(
                    type="rebalance",
                    title=f"High concentration in {holding.symbol}",
                    description=f"{holding.symbol} represents {allocation:.1f}% of your portfolio, which may increase risk.",
                    action=f"Consider reducing your {holding.symbol} position to improve diversification.",
                    priority="high"
                ))
            elif allocation < 5 and len(request.portfolio) > 5:
                recommendations.append(Recommendation(
                    type="rebalance",
                    title=f"Small position in {holding.symbol}",
                    description=f"{holding.symbol} is only {allocation:.1f}% of your portfolio.",
                    action=f"Consider consolidating small positions for easier management.",
                    priority="low"
                ))

        # Check diversification (< 5 stocks)
        if len(request.portfolio) < 5:
            recommendations.append(Recommendation(
                type="diversify",
                title="Limited diversification",
                description=f"Your portfolio contains only {len(request.portfolio)} stocks.",
                action="Consider adding more positions across different sectors to reduce risk.",
                priority="high"
            ))

        # Check for dividend opportunities
        dividend_stocks = [h for h in request.portfolio if h.dividend and h.dividend > 0]
        if len(dividend_stocks) < len(request.portfolio) * 0.3:
            recommendations.append(Recommendation(
                type="dividend",
                title="Consider dividend stocks",
                description="Your portfolio has limited dividend-paying stocks.",
                action="Adding dividend stocks can provide steady income and reduce volatility.",
                priority="medium"
            ))

        # Performance review if metrics provided
        if request.metrics and request.metrics.get('totalReturn', 0) < -5:
            recommendations.append(Recommendation(
                type="review",
                title="Portfolio performance review",
                description="Your portfolio has experienced negative returns.",
                action="Review underperforming positions and consider tax-loss harvesting opportunities.",
                priority="high"
            ))

        logger.api_response('POST', '/stocks/recommendations', 200)
        return JSONResponse(content={
            "recommendations": [r.model_dump(by_alias=True) for r in recommendations]
        })
    except Exception as e:
        logger.api_error('POST', '/stocks/recommendations', e)
        raise HTTPException(status_code=500, detail="Failed to generate recommendations")
