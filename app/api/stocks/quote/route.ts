import YahooFinance from 'yahoo-finance2'
import { stockQuoteRequestSchema } from '@/lib/validations'
import { ZodError } from 'zod'
import { logger } from '@/lib/logger'

const yahooFinance = new YahooFinance()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate request with Zod
    const { symbol } = stockQuoteRequestSchema.parse(body)

    logger.apiRequest('POST', '/api/stocks/quote', { symbol })

    // Fetch quote data from Yahoo Finance using quoteSummary
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ['price', 'summaryDetail', 'defaultKeyStatistics']
    }, { validateResult: false })

    if (!result || !result.price) {
      return Response.json({ error: 'Symbol not found' }, { status: 404 })
    }

    const { price: priceModule, summaryDetail } = result

    const price = priceModule.regularMarketPrice || 0
    const change = priceModule.regularMarketChange || 0
    const changePercent = priceModule.regularMarketChangePercent || 0

    const stockData = {
      symbol: symbol.toUpperCase(),
      price: price,
      change: parseFloat(change.toFixed(2)),
      changePercent: changePercent.toFixed(2),
      high52w: summaryDetail?.fiftyTwoWeekHigh || price,
      low52w: summaryDetail?.fiftyTwoWeekLow || price,
      marketCap: priceModule.marketCap?.toString() || 'N/A',
      pe: summaryDetail?.trailingPE || 0,
      dividendYield: summaryDetail?.dividendYield ? (summaryDetail.dividendYield * 100) : 0,
      volume: priceModule.regularMarketVolume || 0,
      avgVolume: priceModule.averageDailyVolume3Month || 0,
      timestamp: new Date().toISOString(),
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
