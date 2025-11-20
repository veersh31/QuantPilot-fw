// Stock News API using Finnhub
// Get your free API key from: https://finnhub.io/register

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    // Get API key from environment variable
    const apiKey = process.env.FINNHUB_API_KEY

    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not configured, returning demo data')
      // Return demo data if no API key
      return Response.json({ news: getDemoNews(symbol) })
    }

    // Fetch news from Finnhub
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateDaysAgo(7)}&to=${getToday()}&token=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch news from Finnhub')
    }

    const data = await response.json()

    // Transform Finnhub response to our format
    const news = data.slice(0, 10).map((item: any) => ({
      title: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      sentiment: item.sentiment || 'neutral',
      image: item.image,
    }))

    return Response.json({ news })
  } catch (error) {
    console.error('News API error:', error)
    return Response.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}

// Helper functions
function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getDateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

function getDemoNews(symbol: string) {
  return [
    {
      title: `${symbol} Reports Strong Quarterly Earnings`,
      summary: 'Company beats analyst expectations with revenue growth of 15% year-over-year.',
      source: 'Financial Times',
      url: '#',
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sentiment: 'positive'
    },
    {
      title: `Analysts Upgrade ${symbol} to 'Buy' Rating`,
      summary: 'Major investment firms increase price targets following strong performance.',
      source: 'Bloomberg',
      url: '#',
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      sentiment: 'positive'
    },
  ]
}
