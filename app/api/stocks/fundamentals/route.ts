import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Yahoo Finance] Fetching fundamentals for:', symbol)

    // Fetch quote summary and key statistics
    const quoteSummary = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile']
    }, { validateResult: false })

    if (!quoteSummary) {
      console.error('[Yahoo Finance] Symbol not found:', symbol)
      return Response.json({ error: 'Symbol not found' }, { status: 404 })
    }

    const { summaryDetail, defaultKeyStatistics, financialData, assetProfile } = quoteSummary

    const fundamentals = {
      // Valuation Ratios
      peRatio: summaryDetail?.trailingPE || defaultKeyStatistics?.trailingEps ?
        (summaryDetail?.trailingPE || null) : null,
      psRatio: defaultKeyStatistics?.priceToSalesTrailing12Months || null,
      pbRatio: defaultKeyStatistics?.priceToBook || null,

      // Profitability Metrics
      eps: defaultKeyStatistics?.trailingEps || null,
      roe: financialData?.returnOnEquity || null,
      roic: null, // Not directly available in Yahoo Finance
      operatingMargin: financialData?.operatingMargins || null,
      profitMargin: financialData?.profitMargins || null,

      // Financial Health
      debtToEquity: financialData?.debtToEquity || null,
      currentRatio: financialData?.currentRatio || null,
      quickRatio: financialData?.quickRatio || null,

      // Growth & Dividend
      revenueGrowth: financialData?.revenueGrowth || null,
      dividendYield: summaryDetail?.dividendYield ? (summaryDetail.dividendYield * 100) : null,
      payoutRatio: defaultKeyStatistics?.payoutRatio || null,

      // Other Metrics
      marketCap: summaryDetail?.marketCap || null,
      bookValue: defaultKeyStatistics?.bookValue || null,
      beta: defaultKeyStatistics?.beta || null,
      week52High: summaryDetail?.fiftyTwoWeekHigh || null,
      week52Low: summaryDetail?.fiftyTwoWeekLow || null,

      // Company Info
      name: assetProfile?.longName || symbol,
      sector: assetProfile?.sector || 'N/A',
      industry: assetProfile?.industry || 'N/A',
      description: assetProfile?.longBusinessSummary || 'N/A',
    }

    console.log('[Yahoo Finance] Fundamentals fetched successfully:', symbol)

    return Response.json(fundamentals, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Yahoo Finance] Fundamentals fetch error:', error)
    return Response.json({ error: 'Failed to fetch fundamentals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Yahoo Finance] Fetching fundamentals (POST) for:', symbol)

    // Fetch quote summary and key statistics
    const quoteSummary = await yahooFinance.quoteSummary(symbol, {
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile']
    })

    if (!quoteSummary) {
      console.error('[Yahoo Finance] Symbol not found:', symbol)
      return Response.json({ error: 'Symbol not found' }, { status: 404 })
    }

    const { summaryDetail, defaultKeyStatistics, financialData, assetProfile } = quoteSummary

    const fundamentals = {
      // Valuation Ratios
      peRatio: summaryDetail?.trailingPE || defaultKeyStatistics?.trailingEps ?
        (summaryDetail?.trailingPE || null) : null,
      psRatio: defaultKeyStatistics?.priceToSalesTrailing12Months || null,
      pbRatio: defaultKeyStatistics?.priceToBook || null,

      // Profitability Metrics
      eps: defaultKeyStatistics?.trailingEps || null,
      roe: financialData?.returnOnEquity || null,
      roic: null, // Not directly available in Yahoo Finance
      operatingMargin: financialData?.operatingMargins || null,
      profitMargin: financialData?.profitMargins || null,

      // Financial Health
      debtToEquity: financialData?.debtToEquity || null,
      currentRatio: financialData?.currentRatio || null,
      quickRatio: financialData?.quickRatio || null,

      // Growth & Dividend
      revenueGrowth: financialData?.revenueGrowth || null,
      dividendYield: summaryDetail?.dividendYield ? (summaryDetail.dividendYield * 100) : null,
      payoutRatio: defaultKeyStatistics?.payoutRatio || null,

      // Other Metrics
      marketCap: summaryDetail?.marketCap || null,
      bookValue: defaultKeyStatistics?.bookValue || null,
      beta: defaultKeyStatistics?.beta || null,
      week52High: summaryDetail?.fiftyTwoWeekHigh || null,
      week52Low: summaryDetail?.fiftyTwoWeekLow || null,

      // Company Info
      name: assetProfile?.longName || symbol,
      sector: assetProfile?.sector || 'N/A',
      industry: assetProfile?.industry || 'N/A',
      description: assetProfile?.longBusinessSummary || 'N/A',
    }

    console.log('[Yahoo Finance] Fundamentals fetched successfully (POST):', symbol)

    return Response.json(fundamentals, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[Yahoo Finance] Fundamentals fetch error:', error)
    return Response.json({ error: 'Failed to fetch fundamentals' }, { status: 500 })
  }
}
