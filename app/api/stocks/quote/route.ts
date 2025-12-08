import { getQuote } from '@/lib/python-service'
import { stockQuoteRequestSchema } from '@/lib/validations'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request with Zod
    const { symbol } = stockQuoteRequestSchema.parse(body)

    logger.apiRequest('POST', '/api/stocks/quote', { symbol })

    console.log('[Stock Quote] Fetching from Python service:', symbol)

    // Proxy to Python service
    const stockData = await getQuote(symbol)

    logger.stockFetch(symbol, true)

    return Response.json(stockData, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Stock quote validation error', { errors: error.errors })
      return Response.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    logger.apiError('POST', '/api/stocks/quote', error as Error)
    return Response.json({ error: 'Failed to fetch stock data' }, { status: 500 })
  }
}
