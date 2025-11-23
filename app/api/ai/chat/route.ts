import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import YahooFinance from 'yahoo-finance2'
import { calculateTechnicalAnalysis, PriceData } from '@/lib/technical-indicators'

const yahooFinance = new YahooFinance()

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, portfolio, selectedStock, conversationHistory = [], mlPredictions = null } = body

    // Fetch real technical indicators if a stock is selected
    let technicalData = null
    let isETF = false
    let quoteType = 'stock'

    if (selectedStock) {
      technicalData = await fetchTechnicalIndicators(selectedStock)

      // Check if this is an ETF
      try {
        const quoteData = await yahooFinance.quoteSummary(selectedStock, {
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

    // Build comprehensive context for the AI
    const portfolioContext = generatePortfolioContext(portfolio)

    let technicalContext = ''
    if (selectedStock && technicalData) {
      technicalContext = `
Currently analyzing ${selectedStock} with real technical indicators:

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
    } else if (selectedStock) {
      technicalContext = `Currently analyzing ${selectedStock} - technical data loading...`
    } else {
      technicalContext = 'No specific stock selected for detailed analysis.'
    }

    // Build ML Predictions context
    let mlContext = ''
    if (mlPredictions && selectedStock) {
      const pred = mlPredictions.predictions
      const backtest = mlPredictions.backtest

      mlContext = `
🤖 MACHINE LEARNING PRICE PREDICTIONS FOR ${selectedStock}:
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
⚠️ CRITICAL: When discussing ${selectedStock} price predictions, YOU MUST cite these EXACT predicted values above. Never estimate or guess - use the precise numbers provided by the ML model.
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
5. Give one primary recommendation based on data-driven analysis
6. Mention 1-2 risks or considerations
7. End with a clear actionable suggestion

${assetTypeGuidance}

${portfolioContext}

${mlContext}

${technicalContext}

Remember:
- When ML predictions are available, ALWAYS cite the exact predicted prices and percentage returns
- Combine ML model forecasts with technical analysis for robust recommendations
- Base your analysis on REAL data provided above, not generic advice
- The ML model uses 29+ quantitative features and has been backtested`

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
