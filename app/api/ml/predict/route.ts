import { NextRequest } from 'next/server'

// Python ML Service URL (set via environment variable or default to localhost)
const PYTHON_ML_SERVICE_URL = process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log(`[ML API] Forwarding prediction request for ${symbol} to Python service...`)

    // Call Python ML service
    const pythonResponse = await fetch(`${PYTHON_ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol }),
    })

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json()
      console.error('[ML API] Python service error:', errorData)
      return Response.json({
        error: 'Python ML service error',
        details: errorData.detail || 'Unknown error from Python service'
      }, { status: pythonResponse.status })
    }

    const data = await pythonResponse.json()

    console.log(`[ML API] Prediction complete for ${symbol}`)
    console.log(`[ML API] Recommendation: ${data.recommendation}`)

    // Transform response to match expected format
    return Response.json({
      predictions: {
        symbol: data.symbol,
        currentPrice: data.current_price,
        predictions: data.predictions,
        modelPerformances: data.model_performances,
        featureImportance: data.feature_importance,
        confidence: data.confidence,
        recommendation: data.recommendation,
        analysis: data.analysis,
      },
      backtest: data.backtest,
      dataPoints: data.data_points,
      lastUpdate: data.last_update,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('[ML API] Error:', error)

    // Check if Python service is running
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return Response.json({
        error: 'Python ML service is not running',
        details: `Please start the Python service: cd python-ml-service && python app.py`,
        service_url: PYTHON_ML_SERVICE_URL
      }, { status: 503 })
    }

    return Response.json({
      error: 'Failed to generate ML predictions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
