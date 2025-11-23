'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

interface PortfolioStock {
  symbol: string
  name: string
  quantity: number
  avgCost: number
  price: number
}

interface CorrelationMatrixProps {
  portfolio: PortfolioStock[]
}

interface HistoricalPrice {
  date: string
  close: number
}

export function CorrelationMatrix({ portfolio }: CorrelationMatrixProps) {
  const [correlationData, setCorrelationData] = useState<{ [key: string]: { [key: string]: number } }>({})
  const [loading, setLoading] = useState(true)
  const [diversificationScore, setDiversificationScore] = useState(0)

  useEffect(() => {
    const calculateCorrelations = async () => {
      if (portfolio.length < 2) {
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        // Fetch historical data for all stocks
        const historicalDataMap: { [key: string]: HistoricalPrice[] } = {}

        for (const stock of portfolio) {
          try {
            const response = await fetch('/api/stocks/historical', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: stock.symbol, period: '3mo' }),
            })

            if (response.ok) {
              const data = await response.json()
              historicalDataMap[stock.symbol] = data
            }
          } catch (error) {
            console.error(`Error fetching historical data for ${stock.symbol}:`, error)
          }
        }

        // Calculate returns for each stock
        const returnsMap: { [key: string]: number[] } = {}
        for (const symbol in historicalDataMap) {
          const prices = historicalDataMap[symbol]
          const returns: number[] = []

          for (let i = 1; i < prices.length; i++) {
            const dailyReturn = (prices[i].close - prices[i - 1].close) / prices[i - 1].close
            returns.push(dailyReturn)
          }

          returnsMap[symbol] = returns
        }

        // Calculate correlation matrix
        const symbols = Object.keys(returnsMap)
        const correlations: { [key: string]: { [key: string]: number } } = {}

        for (const symbol1 of symbols) {
          correlations[symbol1] = {}
          for (const symbol2 of symbols) {
            if (symbol1 === symbol2) {
              correlations[symbol1][symbol2] = 1
            } else {
              const correlation = calculatePearsonCorrelation(
                returnsMap[symbol1],
                returnsMap[symbol2]
              )
              correlations[symbol1][symbol2] = correlation
            }
          }
        }

        setCorrelationData(correlations)

        // Calculate diversification score (average absolute correlation, lower is better)
        let totalCorrelation = 0
        let count = 0

        for (const symbol1 of symbols) {
          for (const symbol2 of symbols) {
            if (symbol1 !== symbol2) {
              totalCorrelation += Math.abs(correlations[symbol1][symbol2])
              count++
            }
          }
        }

        const avgCorrelation = count > 0 ? totalCorrelation / count : 0
        // Convert to score: 100 = perfectly diversified (0 correlation), 0 = not diversified (1 correlation)
        const score = Math.max(0, Math.min(100, (1 - avgCorrelation) * 100))
        setDiversificationScore(score)
      } catch (error) {
        console.error('Error calculating correlations:', error)
        toast.error('Failed to calculate correlations')
      }

      setLoading(false)
    }

    calculateCorrelations()
  }, [portfolio])

  // Calculate Pearson correlation coefficient
  const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length)
    if (n === 0) return 0

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let sumSquaredX = 0
    let sumSquaredY = 0

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX
      const diffY = y[i] - meanY
      numerator += diffX * diffY
      sumSquaredX += diffX * diffX
      sumSquaredY += diffY * diffY
    }

    const denominator = Math.sqrt(sumSquaredX * sumSquaredY)
    return denominator === 0 ? 0 : numerator / denominator
  }

  const getCorrelationColor = (correlation: number): string => {
    if (correlation >= 0.7) return 'bg-red-500'
    if (correlation >= 0.4) return 'bg-orange-500'
    if (correlation >= 0.1) return 'bg-yellow-500'
    if (correlation >= -0.1) return 'bg-gray-500'
    if (correlation >= -0.4) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getCorrelationIntensity = (correlation: number): string => {
    const absCorr = Math.abs(correlation)
    if (absCorr >= 0.7) return '100'
    if (absCorr >= 0.4) return '75'
    if (absCorr >= 0.1) return '50'
    return '25'
  }

  const getDiversificationColor = (score: number): string => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDiversificationLabel = (score: number): string => {
    if (score >= 70) return 'Well Diversified'
    if (score >= 40) return 'Moderately Diversified'
    return 'Poorly Diversified'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Calculating portfolio correlations...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (portfolio.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Correlation Matrix</CardTitle>
          <CardDescription>Analyze how your stocks move together</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
            <p>Need at least 2 stocks to calculate correlations</p>
            <p className="text-sm mt-2">Add more stocks to your portfolio</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const symbols = Object.keys(correlationData)

  return (
    <div className="space-y-6">
      {/* Diversification Score */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Diversification Score
          </CardTitle>
          <CardDescription>How well your portfolio is diversified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-5xl font-bold ${getDiversificationColor(diversificationScore)}`}>
                {diversificationScore.toFixed(0)}
              </div>
              <div className="text-lg mt-2 text-muted-foreground">
                {getDiversificationLabel(diversificationScore)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-2">Score Range</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>70-100: Well Diversified</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>40-69: Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>0-39: Poor</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Correlation Matrix</CardTitle>
          <CardDescription>How stock returns move together (based on 3-month data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 bg-muted/30"></th>
                  {symbols.map((symbol) => (
                    <th key={symbol} className="border border-border p-2 bg-muted/30 font-bold text-sm">
                      {symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {symbols.map((symbol1) => (
                  <tr key={symbol1}>
                    <td className="border border-border p-2 bg-muted/30 font-bold text-sm">
                      {symbol1}
                    </td>
                    {symbols.map((symbol2) => {
                      const correlation = correlationData[symbol1][symbol2]
                      const color = getCorrelationColor(correlation)
                      const intensity = getCorrelationIntensity(correlation)

                      return (
                        <td
                          key={symbol2}
                          className={`border border-border p-2 text-center ${color}/${intensity} transition-colors hover:${color}/90`}
                        >
                          <span className="text-xs font-semibold text-foreground">
                            {correlation.toFixed(2)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-start gap-2 mb-3">
              <Info size={16} className="mt-0.5 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-semibold mb-2">Understanding Correlations:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span><strong>0.7 to 1.0:</strong> Strong positive - stocks move together (high risk)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-orange-500"></div>
                    <span><strong>0.4 to 0.7:</strong> Moderate positive - some similar movement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-500"></div>
                    <span><strong>0.1 to 0.4:</strong> Weak positive - loosely related</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-500"></div>
                    <span><strong>-0.1 to 0.1:</strong> No correlation - independent movement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span><strong>-0.4 to -0.1:</strong> Weak negative - somewhat opposite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span><strong>-1.0 to -0.4:</strong> Strong negative - move opposite (good for diversification)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle size={20} />
            Diversification Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {diversificationScore < 40 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm font-medium text-red-600">⚠️ High Correlation Risk</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your portfolio has high correlation between stocks. Consider adding stocks from different sectors or asset classes.
                </p>
              </div>
            )}

            {diversificationScore >= 40 && diversificationScore < 70 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-600">⚡ Room for Improvement</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your portfolio is moderately diversified. Look for stocks with low or negative correlation to existing holdings.
                </p>
              </div>
            )}

            {diversificationScore >= 70 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm font-medium text-green-600">✅ Well Diversified</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your portfolio shows good diversification. Continue monitoring correlations as market conditions change.
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium">💡 Tips for Better Diversification:</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                <li>Mix stocks from different sectors (tech, healthcare, finance, etc.)</li>
                <li>Include both growth and value stocks</li>
                <li>Consider international exposure for geographic diversification</li>
                <li>Add bonds or commodities for asset class diversification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
