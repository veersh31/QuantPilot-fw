import yahooFinance from '@/lib/yahoo-finance'
import { stockQuoteRequestSchema } from '@/lib/validations'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request with Zod
    const { symbol } = stockQuoteRequestSchema.parse(body)

    logger.apiRequest('POST', '/api/stocks/quote', { symbol })

    console.log('[Stock Quote] Fetching from Yahoo Finance:', symbol)

    // Fetch quote data from Yahoo Finance
    const quote = await yahooFinance.quote(symbol)

    // Transform to match expected format
    const stockData = {
      symbol: quote.symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      high52w: quote.fiftyTwoWeekHigh || null,
      low52w: quote.fiftyTwoWeekLow || null,
      marketCap: quote.marketCap || null,
      pe: quote.trailingPE || null,
      dividendYield: quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : null,
      volume: quote.regularMarketVolume || null,
      avgVolume: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month || null,
    }

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
