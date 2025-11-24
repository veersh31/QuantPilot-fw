import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import YahooFinance from 'yahoo-finance2'
import { calculateTechnicalAnalysis, PriceData } from '@/lib/technical-indicators'

const yahooFinance = new YahooFinance()

// Helper function to format time ago
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return 'Just now'
  }
}

// Fetch real technical indicators for a stock
async function fetchTechnicalIndicators(symbol: string) {
  try {
    // Fetch last 200 days of data for accurate indicators
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 200)

    const historicalData = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }, { validateResult: false })

    if (!historicalData || historicalData.length === 0) {
      return null
    }

    const priceData: PriceData[] = historicalData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume || 0,
    }))

    return calculateTechnicalAnalysis(priceData)
  } catch (error) {
    console.error('Error fetching technical indicators:', error)
    return null
  }
}

function generatePortfolioContext(portfolio: any[]) {
  if (portfolio.length === 0) {
    return 'The user has no holdings in their portfolio yet.'
  }

  const totalValue = portfolio.reduce((sum, stock) => sum + (stock.price * stock.quantity), 0)
  const holdings = portfolio
    .map(stock => `${stock.symbol}: ${stock.quantity} shares @ $${stock.price.toFixed(2)} (${((stock.price * stock.quantity / totalValue) * 100).toFixed(1)}% of portfolio)`)
    .join('\n')

  return `Portfolio Summary:\n${holdings}\nTotal Portfolio Value: $${totalValue.toFixed(2)}`
}

// Extract stock symbols from user message (e.g., AAPL, MSFT, GOOGL, or "apple", "amazon")
function extractStockSymbols(message: string): string[] {
  const lowerMessage = message.toLowerCase()

  // Company name to symbol mapping
  const companyMap: { [key: string]: string } = {
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'google': 'GOOGL',
    'alphabet': 'GOOGL',
    'amazon': 'AMZN',
    'meta': 'META',
    'facebook': 'META',
    'tesla': 'TSLA',
    'nvidia': 'NVDA',
    'amd': 'AMD',
    'netflix': 'NFLX',
    'disney': 'DIS',
    'paypal': 'PYPL',
    'intel': 'INTC',
    'cisco': 'CSCO',
    'adobe': 'ADBE',
    'salesforce': 'CRM',
    'oracle': 'ORCL',
    'ibm': 'IBM',
    'qualcomm': 'QCOM',
    'texas instruments': 'TXN',
    'broadcom': 'AVGO',
    'costco': 'COST',
    'pepsi': 'PEP',
    'coca cola': 'KO',
    'walmart': 'WMT',
    'jpmorgan': 'JPM',
    'jp morgan': 'JPM',
    'bank of america': 'BAC',
    'wells fargo': 'WFC',
    'goldman sachs': 'GS',
    'morgan stanley': 'MS',
    'citigroup': 'C',
    'visa': 'V',
    'mastercard': 'MA',
    'johnson & johnson': 'JNJ',
    'unitedhealth': 'UNH',
    'pfizer': 'PFE',
    'abbvie': 'ABBV',
    'exxon': 'XOM',
    'chevron': 'CVX'
  }

  // Check for company names first
  for (const [name, symbol] of Object.entries(companyMap)) {
    if (lowerMessage.includes(name)) {
      return [symbol]
    }
  }

  // Then check for uppercase stock symbols
  const symbolPattern = /\b[A-Z]{1,5}\b/g
  const matches = message.match(symbolPattern) || []
  const commonWords = ['I', 'A', 'THE', 'AND', 'OR', 'BUT', 'FOR', 'NOT', 'WITH', 'AS', 'AT', 'BY', 'TO', 'FROM', 'IN', 'ON', 'OF', 'IS', 'IT', 'AI', 'ML', 'USA', 'US', 'ETF', 'PE', 'PS', 'PB', 'RSI', 'MACD', 'SMA', 'EMA', 'OK', 'CEO', 'CFO', 'IPO', 'API', 'FAQ']
  return matches.filter(symbol => !commonWords.includes(symbol))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, portfolio, selectedStock, conversationHistory = [], mlPredictions = null } = body

    // Detect if user is asking about a specific stock in their message
    const mentionedSymbols = extractStockSymbols(message)

    // Use the first mentioned symbol, or fall back to selectedStock
    const targetStock = mentionedSymbols.length > 0 ? mentionedSymbols[0] : selectedStock

    // Fetch real technical indicators for the target stock
    let technicalData = null
    let isETF = false
    let quoteType = 'stock'

    if (targetStock) {
      technicalData = await fetchTechnicalIndicators(targetStock)

      // Check if this is an ETF
      try {
        const quoteData = await yahooFinance.quoteSummary(targetStock, {
          modules: ['price']
        }, { validateResult: false })

        if (quoteData?.price?.quoteType === 'ETF') {
          isETF = true
          quoteType = 'ETF'
        }
      } catch (error) {
        console.error('Error checking quote type:', error)
      }
    }

    // Fetch recent news for the target stock
    let newsData: any[] = []
    if (targetStock) {
      try {
        const newsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/stocks/news`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: targetStock }),
        })

        if (newsResponse.ok) {
          const newsJson = await newsResponse.json()
          newsData = newsJson.news || []
        }
      } catch (error) {
        console.error('Error fetching news:', error)
      }
    }

    // Build comprehensive context for the AI
    const portfolioContext = generatePortfolioContext(portfolio)

    let technicalContext = ''
    if (targetStock && technicalData) {
      const contextPrefix = mentionedSymbols.length > 0
        ? `User is asking about ${targetStock}. Here are the real technical indicators:`
        : `Currently viewing ${targetStock} with real technical indicators:`

      technicalContext = `
${contextPrefix}

RSI: ${technicalData.rsi.value.toFixed(2)} (${technicalData.rsi.signal}) - ${technicalData.rsi.description}

MACD: ${technicalData.macd.macd.toFixed(2)}, Signal: ${technicalData.macd.signal.toFixed(2)}, Histogram: ${technicalData.macd.histogram.toFixed(2)}
Trend: ${technicalData.macd.trend} - ${technicalData.macd.description}

Bollinger Bands: Upper ${technicalData.bollingerBands.upper.toFixed(2)}, Middle ${technicalData.bollingerBands.middle.toFixed(2)}, Lower ${technicalData.bollingerBands.lower.toFixed(2)}
Position: ${technicalData.bollingerBands.position} - ${technicalData.bollingerBands.description}

Moving Averages:
- SMA20: ${technicalData.movingAverages.sma20.toFixed(2)}
- SMA50: ${technicalData.movingAverages.sma50.toFixed(2)}
- SMA200: ${technicalData.movingAverages.sma200.toFixed(2)}
Trend: ${technicalData.movingAverages.trend} - ${technicalData.movingAverages.description}

Stochastic: %K ${technicalData.stochastic.k.toFixed(2)}, %D ${technicalData.stochastic.d.toFixed(2)}
Signal: ${technicalData.stochastic.signal} - ${technicalData.stochastic.description}

OVERALL SIGNAL: ${technicalData.overallSignal.toUpperCase().replace('_', ' ')}`
    } else if (targetStock) {
      technicalContext = `User is asking about ${targetStock} - fetching technical data...`
    } else {
      technicalContext = 'User has not specified a particular stock. Feel free to answer general questions or ask them to specify a stock symbol for detailed analysis.'
    }

    // Build News context
    let newsContext = ''
    if (newsData.length > 0 && targetStock) {
      const topNews = newsData.slice(0, 5) // Get top 5 news items
      newsContext = `
📰 LATEST NEWS FOR ${targetStock}:
${topNews.map((item, idx) => {
        const timeAgo = getTimeAgo(item.publishedAt)
        return `
${idx + 1}. ${item.title}
   Summary: ${item.summary}
   Source: ${item.source} | ${timeAgo}
   Sentiment: ${item.sentiment || 'neutral'}`
      }).join('\n')}

When discussing news, reference these actual headlines and their sentiment.
`
    } else if (targetStock) {
      newsContext = `No recent news available for ${targetStock}.`
    }

    // Build ML Predictions context
    let mlContext = ''
    if (mlPredictions && targetStock) {
      const pred = mlPredictions.predictions
      const backtest = mlPredictions.backtest

      mlContext = `
🤖 MACHINE LEARNING PRICE PREDICTIONS FOR ${targetStock}:
Current Price: $${mlPredictions.current_price}
`

      if (pred.nextDay) {
        mlContext += `
📊 Next Day Prediction:
   Price: $${pred.nextDay.predictedPrice} (${pred.nextDay.predictedReturn > 0 ? '+' : ''}${pred.nextDay.predictedReturn}% return)
   Confidence: ${(pred.nextDay.confidence * 100).toFixed(0)}%
   Range: $${pred.nextDay.lowerBound?.toFixed(2)} - $${pred.nextDay.upperBound?.toFixed(2)}
`
      }

      if (pred.nextWeek) {
        mlContext += `
📈 Next Week Prediction:
   Price: $${pred.nextWeek.predictedPrice} (${pred.nextWeek.predictedReturn > 0 ? '+' : ''}${pred.nextWeek.predictedReturn}% return)
   Confidence: ${(pred.nextWeek.confidence * 100).toFixed(0)}%
`
      }

      if (pred.nextMonth) {
        mlContext += `
📉 Next Month Prediction:
   Price: $${pred.nextMonth.predictedPrice} (${pred.nextMonth.predictedReturn > 0 ? '+' : ''}${pred.nextMonth.predictedReturn}% return)
   Confidence: ${(pred.nextMonth.confidence * 100).toFixed(0)}%
`
      }

      if (backtest) {
        mlContext += `
🎯 Model Performance (Backtesting):
   Total Returns: ${backtest.totalReturns > 0 ? '+' : ''}${backtest.totalReturns}%
   Win Rate: ${backtest.winRate}%
   Sharpe Ratio: ${backtest.sharpeRatio}
   Max Drawdown: ${backtest.maxDrawdown}%
`
      }

      mlContext += `
⚠️ CRITICAL: When discussing ${targetStock} price predictions, YOU MUST cite these EXACT predicted values above. Never estimate or guess - use the precise numbers provided by the ML model.
`
    }

    const assetTypeGuidance = isETF
      ? `IMPORTANT: You are analyzing an ETF (Exchange-Traded Fund), NOT an individual stock.
- ETFs are baskets of securities that track indices, sectors, or themes
- Focus on: expense ratio, diversification, holdings, tracking error, sector exposure
- DO NOT mention: earnings, profit margins, company fundamentals, P/E ratios
- Consider: market trends, sector rotation, risk diversification
- ETFs are passive investments - analyze based on composition and cost efficiency`
      : `You are analyzing an individual stock.
- Focus on: company fundamentals, earnings, growth, competitive position
- Use valuation metrics: P/E, P/S, P/B ratios
- Consider: profitability, debt levels, management quality
- Evaluate competitive advantages and market position`

    const systemPrompt = `You are an expert AI trading advisor for QuantPilot with 20+ years of experience in quantitative finance and machine learning.

When responding:
1. Keep responses SHORT and FOCUSED - maximum 3-4 key points
2. Use clear, direct language - no excessive markdown or formatting
3. PRIORITIZE ML predictions when available - cite EXACT predicted prices and returns
4. Combine ML predictions with technical indicators for comprehensive analysis
5. When news is available, reference specific headlines and their sentiment
6. Give one primary recommendation based on data-driven analysis
7. Mention 1-2 risks or considerations
8. End with a clear actionable suggestion

IMPORTANT: You can answer questions about ANY stock, not just the one currently selected. If the user asks about a specific stock symbol (e.g., AAPL, MSFT, TSLA), provide analysis for that stock even if a different stock is selected in the UI.

${assetTypeGuidance}

${portfolioContext}

${newsContext}

${mlContext}

${technicalContext}

Remember:
- When ML predictions are available, ALWAYS cite the exact predicted prices and percentage returns
- When news is available, reference specific headlines and their sentiment to provide context
- Combine news sentiment, ML forecasts, and technical analysis for comprehensive recommendations
- Base your analysis on REAL data provided above, not generic advice
- The ML model uses 29+ quantitative features and has been backtested
- If the user asks about a stock and you don't have technical data for it, acknowledge that and provide general guidance or offer to analyze it if they want`

    // Build messages array with conversation history
    const messages: any[] = conversationHistory.slice(-10).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }))

    // Add current message if not already in history
    if (!conversationHistory.some((msg: any) => msg.content === message)) {
      messages.push({ role: 'user', content: message })
    }

    const { text: aiResponse } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 600,
    })

    return Response.json({ response: aiResponse })
  } catch (error) {
    console.error('AI Chat Error:', error)
    return Response.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
