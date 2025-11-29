"""Technical indicators API endpoints"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from schemas.indicator import (
    IndicatorsRequest,
    IndicatorsResponse,
    SignalsRequest,
    SignalsResponse
)
from services.technical_indicators import TechnicalIndicatorService
from services.yahoo_finance import YahooFinanceService
from utils.cache import cache_headers
from utils.logger import logger

router = APIRouter()
ta_service = TechnicalIndicatorService()
yf_service = YahooFinanceService()


@router.post("/", response_model=IndicatorsResponse)
async def calculate_indicators_post(request: IndicatorsRequest):
    """Calculate technical indicators (POST method)"""
    return await _calculate_indicators(request.symbol, request.days)


@router.get("/", response_model=IndicatorsResponse)
async def calculate_indicators_get(
    symbol: str = Query(..., description="Stock ticker symbol"),
    days: int = Query(200, description="Number of days of historical data")
):
    """Calculate technical indicators (GET method)"""
    return await _calculate_indicators(symbol, days)


async def _calculate_indicators(symbol: str, days: int = 200):
    """Internal method to calculate technical indicators"""
    try:
        logger.api_request('POST', '/indicators', {"symbol": symbol, "days": days})

        # Fetch historical data
        historical = await yf_service.get_historical(symbol, days)

        if not historical or not historical.get('data') or len(historical['data']) < 50:
            raise HTTPException(
                status_code=404,
                detail=f"Insufficient historical data for {symbol}. Need at least 50 data points."
            )

        # Calculate all indicators
        analysis = ta_service.calculate_all_indicators(symbol, historical['data'])

        logger.api_response('POST', '/indicators', 200)
        return JSONResponse(
            content=analysis,
            headers=cache_headers(300)  # 5 min cache
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.warn(f"Indicator calculation validation error for {symbol}", {"error": str(e)})
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.api_error('POST', '/indicators', e)
        raise HTTPException(status_code=500, detail="Failed to calculate indicators")


@router.post("/signals", response_model=SignalsResponse)
async def generate_signals(request: SignalsRequest):
    """Generate trading signals from indicator data"""
    try:
        logger.api_request('POST', '/indicators/signals', {"symbol": request.symbol})

        signals = ta_service.calculate_signals(request.symbol, request.data)

        logger.api_response('POST', '/indicators/signals', 200)
        return JSONResponse(content={"signals": signals})

    except Exception as e:
        logger.api_error('POST', '/indicators/signals', e)
        raise HTTPException(status_code=500, detail="Failed to generate signals")
