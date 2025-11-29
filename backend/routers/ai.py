"""AI chatbot API endpoint"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from schemas.ai import ChatRequest, ChatResponse
from services.ai_service import AIService
from utils.logger import logger

router = APIRouter()
ai_service = AIService()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI-powered trading advisor chatbot

    Provides:
    - Portfolio analysis and recommendations
    - Stock insights and market trends
    - Technical analysis explanations
    - Personalized investment advice
    """
    try:
        logger.api_request('POST', '/ai/chat', {"message_length": len(request.message)})

        # Convert portfolio holdings to dict
        portfolio = [holding.model_dump() for holding in request.portfolio]

        # Convert conversation history to dict
        history = [msg.model_dump() for msg in request.conversation_history]

        # Generate AI response
        response_text = await ai_service.generate_response(
            message=request.message,
            portfolio=portfolio,
            selected_stock=request.selected_stock,
            conversation_history=history,
            ml_predictions=request.ml_predictions
        )

        logger.api_response('POST', '/ai/chat', 200)
        return JSONResponse(content={"response": response_text})

    except Exception as e:
        logger.api_error('POST', '/ai/chat', e)
        raise HTTPException(status_code=500, detail="AI chat failed")
