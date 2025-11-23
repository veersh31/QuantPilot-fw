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
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile', 'price', 'fundProfile', 'topHoldings']
    }, { validateResult: false })

    if (!quoteSummary) {
      console.error('[Yahoo Finance] Symbol not found:', symbol)
      return Response.json({ error: 'Symbol not found' }, { status: 404 })
    }

    const { summaryDetail, defaultKeyStatistics, financialData, assetProfile, price, fundProfile, topHoldings } = quoteSummary

    // Check if this is an ETF
    const isETF = price?.quoteType === 'ETF'

    let fundamentals: any = {
      isETF,
      name: assetProfile?.longName || fundProfile?.longName || symbol,
      description: assetProfile?.longBusinessSummary || fundProfile?.longBusinessSummary || 'N/A',

      // Common metrics for both stocks and ETFs
      beta: defaultKeyStatistics?.beta || null,
      week52High: summaryDetail?.fiftyTwoWeekHigh || null,
      week52Low: summaryDetail?.fiftyTwoWeekLow || null,
      dividendYield: summaryDetail?.dividendYield ? (summaryDetail.dividendYield * 100) : null,
      volume: price?.regularMarketVolume || null,
      avgVolume: price?.averageDailyVolume3Month || null,
    }

    if (isETF) {
      // ETF-specific metrics
      fundamentals = {
        ...fundamentals,
        category: fundProfile?.categoryName || assetProfile?.industry || 'N/A',
        fundFamily: fundProfile?.fundFamily || 'N/A',
        totalAssets: fundProfile?.totalAssets || summaryDetail?.totalAssets || null,
        expenseRatio: fundProfile?.annualReportExpenseRatio ? (fundProfile.annualReportExpenseRatio * 100) : null,
        ytdReturn: fundProfile?.ytdReturn ? (fundProfile.ytdReturn * 100) : null,
        threeYearReturn: fundProfile?.threeYearAverageReturn ? (fundProfile.threeYearAverageReturn * 100) : null,
        fiveYearReturn: fundProfile?.fiveYearAverageReturn ? (fundProfile.fiveYearAverageReturn * 100) : null,
        holdings: topHoldings?.holdings?.slice(0, 10).map((h: any) => ({
          symbol: h.symbol,
          name: h.holdingName,
          percent: h.holdingPercent ? (h.holdingPercent * 100) : null
        })) || [],
        inceptionDate: fundProfile?.fundInceptionDate || null,
      }
    } else {
      // Stock-specific metrics
      fundamentals = {
        ...fundamentals,
        sector: assetProfile?.sector || 'N/A',
        industry: assetProfile?.industry || 'N/A',

        // Valuation Ratios
        peRatio: summaryDetail?.trailingPE || defaultKeyStatistics?.trailingEps ?
          (summaryDetail?.trailingPE || null) : null,
        psRatio: defaultKeyStatistics?.priceToSalesTrailing12Months || null,
        pbRatio: defaultKeyStatistics?.priceToBook || null,

        // Profitability Metrics
        eps: defaultKeyStatistics?.trailingEps || null,
        roe: financialData?.returnOnEquity || null,
        roic: null,
        operatingMargin: financialData?.operatingMargins || null,
        profitMargin: financialData?.profitMargins || null,

        // Financial Health
        debtToEquity: financialData?.debtToEquity || null,
        currentRatio: financialData?.currentRatio || null,
        quickRatio: financialData?.quickRatio || null,

        // Growth & Dividend
        revenueGrowth: financialData?.revenueGrowth || null,
        payoutRatio: defaultKeyStatistics?.payoutRatio || null,
        marketCap: summaryDetail?.marketCap || null,
        bookValue: defaultKeyStatistics?.bookValue || null,
      }
    }

    console.log('[Yahoo Finance] Fundamentals fetched successfully:', symbol, '- Type:', isETF ? 'ETF' : 'Stock')

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
      modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData', 'assetProfile', 'price', 'fundProfile', 'topHoldings']
    }, { validateResult: false })

    if (!quoteSummary) {
      console.error('[Yahoo Finance] Symbol not found:', symbol)
      return Response.json({ error: 'Symbol not found' }, { status: 404 })
    }

    const { summaryDetail, defaultKeyStatistics, financialData, assetProfile, price, fundProfile, topHoldings } = quoteSummary

    // Check if this is an ETF
    const isETF = price?.quoteType === 'ETF'

    let fundamentals: any = {
      isETF,
      name: assetProfile?.longName || fundProfile?.longName || symbol,
      description: assetProfile?.longBusinessSummary || fundProfile?.longBusinessSummary || 'N/A',

      // Common metrics for both stocks and ETFs
      beta: defaultKeyStatistics?.beta || null,
      week52High: summaryDetail?.fiftyTwoWeekHigh || null,
      week52Low: summaryDetail?.fiftyTwoWeekLow || null,
      dividendYield: summaryDetail?.dividendYield ? (summaryDetail.dividendYield * 100) : null,
      volume: price?.regularMarketVolume || null,
      avgVolume: price?.averageDailyVolume3Month || null,
    }

    if (isETF) {
      // ETF-specific metrics
      fundamentals = {
        ...fundamentals,
        category: fundProfile?.categoryName || assetProfile?.industry || 'N/A',
        fundFamily: fundProfile?.fundFamily || 'N/A',
        totalAssets: fundProfile?.totalAssets || summaryDetail?.totalAssets || null,
        expenseRatio: fundProfile?.annualReportExpenseRatio ? (fundProfile.annualReportExpenseRatio * 100) : null,
        ytdReturn: fundProfile?.ytdReturn ? (fundProfile.ytdReturn * 100) : null,
        threeYearReturn: fundProfile?.threeYearAverageReturn ? (fundProfile.threeYearAverageReturn * 100) : null,
        fiveYearReturn: fundProfile?.fiveYearAverageReturn ? (fundProfile.fiveYearAverageReturn * 100) : null,
        holdings: topHoldings?.holdings?.slice(0, 10).map((h: any) => ({
          symbol: h.symbol,
          name: h.holdingName,
          percent: h.holdingPercent ? (h.holdingPercent * 100) : null
        })) || [],
        inceptionDate: fundProfile?.fundInceptionDate || null,
      }
    } else {
      // Stock-specific metrics
      fundamentals = {
        ...fundamentals,
        sector: assetProfile?.sector || 'N/A',
        industry: assetProfile?.industry || 'N/A',

        // Valuation Ratios
        peRatio: summaryDetail?.trailingPE || defaultKeyStatistics?.trailingEps ?
          (summaryDetail?.trailingPE || null) : null,
        psRatio: defaultKeyStatistics?.priceToSalesTrailing12Months || null,
        pbRatio: defaultKeyStatistics?.priceToBook || null,

        // Profitability Metrics
        eps: defaultKeyStatistics?.trailingEps || null,
        roe: financialData?.returnOnEquity || null,
        roic: null,
        operatingMargin: financialData?.operatingMargins || null,
        profitMargin: financialData?.profitMargins || null,

        // Financial Health
        debtToEquity: financialData?.debtToEquity || null,
        currentRatio: financialData?.currentRatio || null,
        quickRatio: financialData?.quickRatio || null,

        // Growth & Dividend
        revenueGrowth: financialData?.revenueGrowth || null,
        payoutRatio: defaultKeyStatistics?.payoutRatio || null,
        marketCap: summaryDetail?.marketCap || null,
        bookValue: defaultKeyStatistics?.bookValue || null,
      }
    }

    console.log('[Yahoo Finance] Fundamentals fetched successfully (POST):', symbol, '- Type:', isETF ? 'ETF' : 'Stock')

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
