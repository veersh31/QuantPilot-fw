import { getFundamentals } from '@/lib/python-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Fundamentals] Fetching from Python service:', symbol)

    // Proxy to Python service
    const fundamentals = await getFundamentals(symbol)

    return Response.json(fundamentals, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Fundamentals] Fetch error:', error)
    return Response.json({ error: 'Failed to fetch fundamentals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Fundamentals] Fetching from Python service (POST):', symbol)

    // Proxy to Python service
    const fundamentals = await getFundamentals(symbol)

    return Response.json(fundamentals, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Fundamentals] Fetch error:', error)
    return Response.json({ error: 'Failed to fetch fundamentals' }, { status: 500 })
  }
}
