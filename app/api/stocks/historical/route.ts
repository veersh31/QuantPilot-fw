import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export async function POST(request: Request) {
  try {
    const { symbol, days = 30 } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Yahoo Finance] Fetching historical data for:', symbol, 'Days:', days)

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Fetch historical data from Yahoo Finance
    const result = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }, { validateResult: false })

    if (!result || result.length === 0) {
      return Response.json({ error: 'Symbol not found or no data available' }, { status: 404 })
    }

    const historicalData = result.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      close: item.close,
      high: item.high,
      low: item.low,
      volume: item.volume,
    }))

    console.log('[Yahoo Finance] Historical data fetched successfully:', historicalData.length, 'records')

    return Response.json({ symbol: symbol.toUpperCase(), data: historicalData })
  } catch (error) {
    console.error('[Yahoo Finance] Historical data error:', error)
    return Response.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
