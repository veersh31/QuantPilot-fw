"""Pydantic schemas for technical indicators endpoints"""
from pydantic import BaseModel, Field
from typing import Optional, List


# ===== Technical Indicators Endpoint =====
class IndicatorsRequest(BaseModel):
    """Request schema for technical indicators"""
    symbol: str
    days: int = 200


class IndicatorsResponse(BaseModel):
    """Response schema for technical indicators analysis"""
    symbol: str
    analysis: dict  # Contains all indicator results
    data_points: int = Field(..., alias="dataPoints")
    current_price: float = Field(..., alias="currentPrice")

    class Config:
        populate_by_name = True


# ===== Trading Signals Endpoint =====
class SignalsRequest(BaseModel):
    """Request schema for trading signals"""
    symbol: str
    data: dict  # Contains RSI, MACD, price, bollinger bands, etc.


class Signal(BaseModel):
    """Single trading signal"""
    type: str  # 'bullish' | 'bearish' | 'warning'
    indicator: str
    signal: str
    confidence: float  # 0.0 to 1.0
    timestamp: str


class SignalsResponse(BaseModel):
    """Response schema for trading signals"""
    signals: List[Signal]
