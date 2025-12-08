import { getHistoricalData } from '@/lib/python-service'

export async function POST(request: Request) {
  try {
    const { symbol, days = 30 } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Historical Data] Fetching from Python service:', symbol, 'Days:', days)

    // Proxy to Python service
    const result = await getHistoricalData(symbol, days)

    // Transform response to match existing format
    return Response.json({
      symbol: result.symbol,
      data: result.data
    })
  } catch (error) {
    console.error('[Historical Data] Error:', error)
    return Response.json({ error: 'Failed to fetch historical data' }, { status: 500 })
  }
}
