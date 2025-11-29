"""ML predictions API endpoint"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from schemas.ml import PredictionRequest, PredictionResponse
from services.ml_service import MLService
from utils.cache import cache_headers
from utils.logger import logger

router = APIRouter()
ml_service = MLService()


@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Generate ML predictions for stock/ETF

    This endpoint:
    1. Fetches 2 years of historical data
    2. Engineers 40+ features
    3. Trains ensemble of ML models
    4. Generates predictions for multiple timeframes
    5. Runs backtesting
    6. Returns comprehensive results
    """
    try:
        symbol = request.symbol.upper()

        logger.api_request('POST', '/ml/predict', {"symbol": symbol})

        # Generate predictions
        result = await ml_service.generate_predictions(symbol)

        logger.api_response('POST', '/ml/predict', 200)
        return JSONResponse(
            content=result,
            headers=cache_headers(300)  # 5 min cache
        )

    except ValueError as e:
        logger.warn(f"ML prediction validation error for {request.symbol}", {"error": str(e)})
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.api_error('POST', '/ml/predict', e)
        raise HTTPException(status_code=500, detail="ML prediction failed")
