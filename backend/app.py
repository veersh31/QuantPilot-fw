"""QuantPilot Backend - Unified FastAPI Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

# Import routers (will be created in subsequent steps)
from routers import stocks, indicators, ai, ml

# Create FastAPI app
app = FastAPI(
    title="QuantPilot API",
    version="1.0.0",
    description="Unified Python backend for QuantPilot stock analytics platform"
)

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
app.include_router(indicators.router, prefix="/indicators", tags=["indicators"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(ml.router, prefix="/ml", tags=["ml"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "QuantPilot API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    )
