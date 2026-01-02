import yahooFinance from '@/lib/yahoo-finance'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || query.trim().length === 0) {
      return Response.json({ error: 'Query is required' }, { status: 400 })
    }

    logger.apiRequest('POST', '/api/stocks/search', { query })

    // Use Yahoo Finance search
    const results = await yahooFinance.search(query, {
      newsCount: 0,
      enableNavLinks: false,
      enableEnhancedTrivialQuery: true
    })

    // Filter for stocks and ETFs only
    const filtered = results.quotes
      .filter((quote: any) =>
        quote.quoteType === 'EQUITY' ||
        quote.quoteType === 'ETF' ||
        quote.quoteType === 'MUTUALFUND'
      )
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname,
        type: quote.quoteType,
        exchange: quote.exchange
      }))
      .slice(0, 10) // Limit to top 10 results

    return Response.json({ results: filtered })
  } catch (error) {
    logger.apiError('POST', '/api/stocks/search', error as Error)
    return Response.json({ error: 'Failed to search stocks' }, { status: 500 })
  }
}
