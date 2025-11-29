"""Pydantic schemas for ML prediction endpoints"""
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional


class PredictionRequest(BaseModel):
    """Request schema for ML predictions"""
    symbol: str


class TimeframePrediction(BaseModel):
    """Prediction for a specific timeframe"""
    predicted_price: float = Field(..., alias="predictedPrice")
    predicted_return: float = Field(..., alias="predictedReturn")
    confidence: float
    lower_bound: Optional[float] = Field(None, alias="lowerBound")
    upper_bound: Optional[float] = Field(None, alias="upperBound")

    class Config:
        populate_by_name = True


class Predictions(BaseModel):
    """All timeframe predictions"""
    next_day: Optional[TimeframePrediction] = Field(None, alias="nextDay")
    next_week: Optional[TimeframePrediction] = Field(None, alias="nextWeek")
    next_month: Optional[TimeframePrediction] = Field(None, alias="nextMonth")

    class Config:
        populate_by_name = True


class ModelPerformance(BaseModel):
    """Performance metrics for a single model"""
    mae: float
    rmse: float
    mape: float
    r2: float
    directional_accuracy: Optional[float] = Field(None, alias="directionalAccuracy")

    class Config:
        populate_by_name = True


class FeatureImportance(BaseModel):
    """Feature importance for model explainability"""
    feature: str
    importance: float


class BacktestResults(BaseModel):
    """Backtesting results"""
    total_returns: float = Field(..., alias="totalReturns")
    annualized_returns: float = Field(..., alias="annualizedReturns")
    sharpe_ratio: float = Field(..., alias="sharpeRatio")
    max_drawdown: float = Field(..., alias="maxDrawdown")
    win_rate: float = Field(..., alias="winRate")
    profit_factor: float = Field(..., alias="profitFactor")
    trades: List[Dict] = []

    class Config:
        populate_by_name = True


class PredictionData(BaseModel):
    """ML prediction data"""
    symbol: str
    current_price: float = Field(..., alias="currentPrice")
    predictions: Predictions
    model_performances: Dict[str, ModelPerformance] = Field(..., alias="modelPerformances")
    feature_importance: List[FeatureImportance] = Field(..., alias="featureImportance")
    confidence: float
    recommendation: str  # "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL"
    analysis: str

    class Config:
        populate_by_name = True


class PredictionResponse(BaseModel):
    """Response schema for ML predictions"""
    predictions: PredictionData
    backtest: BacktestResults
    data_points: int = Field(..., alias="dataPoints")
    last_update: str = Field(..., alias="lastUpdate")

    class Config:
        populate_by_name = True
