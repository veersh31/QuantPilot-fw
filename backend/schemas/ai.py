"""Pydantic schemas for AI chatbot endpoint"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ConversationMessage(BaseModel):
    """Single conversation message"""
    role: str  # 'user' | 'assistant'
    content: str


class PortfolioHolding(BaseModel):
    """Portfolio holding for context"""
    symbol: str
    quantity: int
    price: float
    dividend: Optional[float] = None


class ChatRequest(BaseModel):
    """Request schema for AI chat"""
    message: str
    portfolio: List[PortfolioHolding] = []
    selected_stock: Optional[str] = Field(None, alias="selectedStock")
    conversation_history: List[ConversationMessage] = Field([], alias="conversationHistory")
    ml_predictions: Optional[Dict[str, Any]] = Field(None, alias="mlPredictions")

    class Config:
        populate_by_name = True


class ChatResponse(BaseModel):
    """Response schema for AI chat"""
    response: str
