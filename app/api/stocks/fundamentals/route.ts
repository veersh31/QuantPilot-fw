import yahooFinance from '@/lib/yahoo-finance'

async function fetchFundamentals(symbol: string) {
  console.log('[Fundamentals] Fetching from Yahoo Finance:', symbol)

  // Fetch comprehensive data using quoteSummary
  const result = await yahooFinance.quoteSummary(symbol, {
    modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail']
  })

  const keyStats = result.defaultKeyStatistics
  const financial = result.financialData
  const summary = result.summaryDetail

  // Transform to match expected format
  const fundamentals = {
    symbol,
    peRatio: summary?.trailingPE || keyStats?.trailingEps ? (summary?.previousClose || 0) / (keyStats?.trailingEps || 1) : null,
    forwardPE: summary?.forwardPE || null,
    priceToBook: keyStats?.priceToBook || null,
    priceToSales: keyStats?.priceToSalesTrailing12Months || null,
    eps: keyStats?.trailingEps || null,
    beta: keyStats?.beta || null,
    dividendYield: summary?.dividendYield ? summary.dividendYield * 100 : null,
    dividendRate: summary?.dividendRate || null,
    marketCap: summary?.marketCap || null,
    enterpriseValue: keyStats?.enterpriseValue || null,
    profitMargin: financial?.profitMargins ? financial.profitMargins * 100 : null,
    operatingMargin: financial?.operatingMargins ? financial.operatingMargins * 100 : null,
    returnOnAssets: financial?.returnOnAssets ? financial.returnOnAssets * 100 : null,
    returnOnEquity: financial?.returnOnEquity ? financial.returnOnEquity * 100 : null,
    revenue: financial?.totalRevenue || null,
    revenuePerShare: financial?.revenuePerShare || null,
    quarterlyRevenueGrowth: financial?.revenueGrowth ? financial.revenueGrowth * 100 : null,
    grossProfit: financial?.grossProfits || null,
    ebitda: financial?.ebitda || null,
    debtToEquity: financial?.debtToEquity || null,
    currentRatio: financial?.currentRatio || null,
    bookValuePerShare: keyStats?.bookValue || null,
    fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh || null,
    fiftyTwoWeekLow: summary?.fiftyTwoWeekLow || null,
    fiftyDayAverage: summary?.fiftyDayAverage || null,
    twoHundredDayAverage: summary?.twoHundredDayAverage || null,
  }

  return fundamentals
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    const fundamentals = await fetchFundamentals(symbol)

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

    const fundamentals = await fetchFundamentals(symbol)

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
