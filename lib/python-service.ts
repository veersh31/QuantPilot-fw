/**
 * Python ML Service Client
 * Centralized client for communicating with the Python backend
 */

const PYTHON_SERVICE_URL = process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000'

export interface PythonServiceError {
  detail: string
}

/**
 * Make a request to the Python ML service
 */
async function callPythonService<T>(
  endpoint: string,
  data?: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const url = `${PYTHON_SERVICE_URL}${endpoint}`

  console.log(`[Python Service] ${method} ${endpoint}`, data || '')

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (method === 'POST' && data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const error = await response.json() as PythonServiceError
      throw new Error(error.detail || `Python service error: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[Python Service] ✓ ${endpoint} completed`)

    return result as T
  } catch (error) {
    console.error(`[Python Service] ✗ ${endpoint} failed:`, error)
    throw error
  }
}

/**
 * Get historical OHLCV data
 */
export async function getHistoricalData(symbol: string, days: number = 730) {
  return callPythonService('/historical', { symbol, days })
}

/**
 * Get current quote data
 */
export async function getQuote(symbol: string) {
  return callPythonService('/quote', { symbol })
}

/**
 * Get fundamental data
 */
export async function getFundamentals(symbol: string) {
  return callPythonService('/fundamentals', { symbol })
}

/**
 * Calculate technical indicators
 */
export async function getIndicators(symbol: string, days: number = 200) {
  return callPythonService('/indicators', { symbol, days })
}

/**
 * Get engineered ML features
 */
export async function getFeatures(symbol: string, days: number = 730) {
  return callPythonService('/features', { symbol, days })
}

/**
 * Get ML predictions
 */
export async function getPredictions(symbol: string) {
  return callPythonService('/predict', { symbol })
}

/**
 * Get news for a stock symbol
 */
export async function getNews(symbol: string) {
  return callPythonService('/news', { symbol })
}

/**
 * Search for stocks and ETFs
 */
export async function searchStocks(query: string) {
  return callPythonService('/search', { query })
}

/**
 * Generate trading signals from technical indicator data
 */
export async function getSignals(symbol: string, data: any) {
  return callPythonService('/indicators/signals', { symbol, data })
}

/**
 * AI chat assistant
 */
export async function aiChat(
  message: string,
  portfolio: any[] = [],
  selectedStock?: string,
  conversationHistory: any[] = [],
  mlPredictions?: any,
  portfolioNews: Record<string, any[]> = {},
  marketNews: any[] = []
) {
  return callPythonService('/ai/chat', {
    message,
    portfolio,
    selectedStock,
    conversationHistory,
    mlPredictions,
    portfolioNews,
    marketNews
  })
}

/**
 * Get portfolio recommendations
 */
export async function getRecommendations(
  portfolio: any[],
  metrics?: any,
  selectedStock?: string
) {
  return callPythonService('/recommendations', {
    portfolio,
    metrics,
    selectedStock
  })
}

/**
 * Get indicators timeseries data for charting
 */
export async function getIndicatorsTimeseries(symbol: string, days: number = 200) {
  return callPythonService('/indicators/timeseries', { symbol, days })
}

/**
 * Check service health
 */
export async function checkHealth() {
  return callPythonService('/health', undefined, 'GET')
}
