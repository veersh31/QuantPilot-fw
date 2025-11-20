// Alternative News API implementation using Alpha Vantage
// Get your free API key from: https://www.alphavantage.co/support/#api-key
//
// To use this instead of Finnhub:
// 1. Rename this file to route.ts (replace the current route.ts)
// 2. Add ALPHA_VANTAGE_API_KEY to your .env.local
// 3. Restart your dev server

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
      console.warn('ALPHA_VANTAGE_API_KEY not configured')
      return Response.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Alpha Vantage News & Sentiment API
    const response = await fetch(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}&limit=10`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch news from Alpha Vantage')
    }

    const data = await response.json()

    if (data.Note) {
      // API rate limit reached
      return Response.json({
        error: 'API rate limit reached. Please try again later.'
      }, { status: 429 })
    }

    // Transform Alpha Vantage response
    const news = data.feed?.slice(0, 10).map((item: any) => {
      // Calculate sentiment from score
      let sentiment = 'neutral'
      const score = parseFloat(item.overall_sentiment_score || '0')
      if (score > 0.15) sentiment = 'positive'
      else if (score < -0.15) sentiment = 'negative'

      return {
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: item.time_published,
        sentiment,
        sentimentScore: score,
      }
    }) || []

    return Response.json({ news })
  } catch (error) {
    console.error('Alpha Vantage News API error:', error)
    return Response.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}
