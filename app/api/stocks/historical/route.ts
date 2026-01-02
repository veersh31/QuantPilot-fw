import yahooFinance from '@/lib/yahoo-finance'

export async function POST(request: Request) {
  try {
    const { symbol, days = 30 } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Historical Data] Fetching from Yahoo Finance:', symbol, 'Days:', days)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch historical data from Yahoo Finance
    const queryOptions = {
      period1: startDate,
      period2: endDate,
      interval: '1d' as const,
    }

    const result = await yahooFinance.historical(symbol, queryOptions)

    // Transform to match expected format
    const data = result.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }))

    return Response.json({
      symbol,
      data
    })
  } catch (error) {
    console.error('[Historical Data] Error:', error)
    return Response.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
