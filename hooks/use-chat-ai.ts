import { useCallback } from 'react'

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

export function useChatWithAI() {
  const generateResponse = useCallback(
    async (
      userMessage: string,
      portfolio: any[],
      selectedStock: string | null,
      conversationHistory: any[] = []
    ) => {
      try {
        // Detect stock symbols in user message
        const mentionedSymbols = extractStockSymbols(userMessage)

        // Use mentioned stock or fall back to selected stock
        const targetStock = mentionedSymbols.length > 0 ? mentionedSymbols[0] : selectedStock

        // Fetch ML predictions for target stock if available
        let mlPredictions = null
        if (targetStock) {
          try {
            // Call the Next.js ML API route which forwards to Python service
            // This works both locally and on Vercel (if ML service is deployed)
            const mlResponse = await fetch('/api/ml/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: targetStock }),
            })
            if (mlResponse.ok) {
              const data = await mlResponse.json()
              mlPredictions = data.predictions
            }
          } catch (err) {
            console.log('ML predictions not available - ML service may not be running')
          }
        }

        // Fetch news for all portfolio stocks + general market news
        let portfolioNews: any = {}
        let marketNews: any[] = []

        try {
          // Get unique symbols from portfolio
          const portfolioSymbols = [...new Set(portfolio.map(stock => stock.symbol))]

          // Fetch news for each portfolio stock (limit to top 5 by portfolio weight to avoid too many requests)
          const topPortfolioStocks = portfolio
            .sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity))
            .slice(0, 5)
            .map(stock => stock.symbol)

          const newsPromises = topPortfolioStocks.map(async (symbol) => {
            try {
              const newsResponse = await fetch('/api/stocks/news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol }),
              })
              if (newsResponse.ok) {
                const data = await newsResponse.json()
                return { symbol, news: data.news || [] }
              }
            } catch (err) {
              console.log(`Failed to fetch news for ${symbol}`)
            }
            return { symbol, news: [] }
          })

          // Fetch general market news (SPY as proxy for market)
          const marketNewsPromise = fetch('/api/stocks/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'SPY' }),
          }).then(res => res.ok ? res.json() : { news: [] })
            .then(data => data.news || [])
            .catch(() => [])

          const [portfolioNewsResults, marketNewsResult] = await Promise.all([
            Promise.all(newsPromises),
            marketNewsPromise
          ])

          // Build portfolioNews object
          portfolioNewsResults.forEach(result => {
            if (result.news.length > 0) {
              portfolioNews[result.symbol] = result.news.slice(0, 3) // Top 3 for each stock
            }
          })

          marketNews = marketNewsResult.slice(0, 5) // Top 5 market news
        } catch (err) {
          console.log('Failed to fetch portfolio/market news')
        }

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            portfolio,
            selectedStock,
            conversationHistory: conversationHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            mlPredictions,
            portfolioNews,
            marketNews,
            timestamp: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get AI response')
        }

        const data = await response.json()
        return data.response
      } catch (error) {
        console.error('Error calling AI API:', error)
        throw error
      }
    },
    []
  )

  return { generateResponse }
}
