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
            const mlResponse = await fetch('http://localhost:8000/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: targetStock }),
            })
            if (mlResponse.ok) {
              mlPredictions = await mlResponse.json()
            }
          } catch (err) {
            console.log('ML predictions not available')
          }
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
