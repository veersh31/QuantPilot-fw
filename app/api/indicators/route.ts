import { getIndicators } from '@/lib/python-service'

export async function POST(request: Request) {
  try {
    const { symbol, days = 200 } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Technical Indicators] Fetching from Python service:', symbol)

    // Proxy to Python service
    const result = await getIndicators(symbol, days)

    return Response.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('[Technical Indicators] Error:', error)
    return Response.json({ error: 'Failed to calculate indicators' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const days = parseInt(searchParams.get('days') || '200')

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Technical Indicators] Fetching from Python service:', symbol)

    // Proxy to Python service
    const result = await getIndicators(symbol, days)

    return Response.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('[Technical Indicators] Error:', error)
    return Response.json({ error: 'Failed to calculate indicators' }, { status: 500 })
  }
}
