'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface StockComparisonData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: string
  pe: number
  dividendYield: number
  high52w: number
  low52w: number
  volume: number
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export function StockComparison() {
  const [symbols, setSymbols] = useState<string[]>([])
  const [newSymbol, setNewSymbol] = useState('')
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState<{ [key: string]: StockComparisonData }>({})
  const [chartData, setChartData] = useState<any[]>([])

  const fetchStockData = async (symbol: string) => {
    try {
      const response = await fetch('/api/stocks/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })

      if (!response.ok) throw new Error('Failed to fetch stock data')

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error)
      return null
    }
  }

  const fetchHistoricalData = async (symbol: string) => {
    try {
      const response = await fetch('/api/stocks/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, period: '1mo' }),
      })

      if (!response.ok) throw new Error('Failed to fetch historical data')

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      return null
    }
  }

  const handleAddSymbol = async () => {
    if (!newSymbol.trim()) return

    const symbol = newSymbol.toUpperCase().trim()

    // Limit to 4 stocks
    if (symbols.length >= 4) {
      toast.error('Maximum 4 stocks can be compared')
      return
    }

    // Check if already added
    if (symbols.includes(symbol)) {
      toast.info(`${symbol} is already being compared`)
      setNewSymbol('')
      return
    }

    setLoading(true)
    const data = await fetchStockData(symbol)

    if (data) {
      setSymbols([...symbols, symbol])
      setComparisonData(prev => ({ ...prev, [symbol]: data }))
      toast.success(`${symbol} added to comparison`)
      setNewSymbol('')
    } else {
      toast.error(`Failed to fetch data for ${symbol}`)
    }

    setLoading(false)
  }

  const handleRemoveSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol))
    const newData = { ...comparisonData }
    delete newData[symbol]
    setComparisonData(newData)
    toast.success(`${symbol} removed from comparison`)
  }

  // Fetch historical data for chart when symbols change
  useEffect(() => {
    const fetchAllHistoricalData = async () => {
      if (symbols.length === 0) {
        setChartData([])
        return
      }

      const allHistoricalData: { [key: string]: any[] } = {}

      for (const symbol of symbols) {
        const historicalData = await fetchHistoricalData(symbol)
        if (historicalData && historicalData.length > 0) {
          allHistoricalData[symbol] = historicalData
        }
      }

      // Normalize data to show relative performance (percentage change from start)
      const normalizedData: any[] = []
      const maxLength = Math.max(...Object.values(allHistoricalData).map((d: any) => d.length))

      for (let i = 0; i < maxLength; i++) {
        const dataPoint: any = { index: i }

        for (const symbol of symbols) {
          const data = allHistoricalData[symbol]
          if (data && data[i]) {
            const startPrice = data[0].close
            const currentPrice = data[i].close
            const percentChange = ((currentPrice - startPrice) / startPrice) * 100
            dataPoint[symbol] = percentChange.toFixed(2)
            dataPoint[`${symbol}_date`] = data[i].date
          }
        }

        normalizedData.push(dataPoint)
      }

      setChartData(normalizedData)
    }

    fetchAllHistoricalData()
  }, [symbols])

  return (
    <div className="space-y-6">
      {/* Add Stock Input */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Stocks</CardTitle>
          <CardDescription>Add up to 4 stocks to compare side-by-side</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter symbol (e.g., AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddSymbol()
                }
              }}
              disabled={loading || symbols.length >= 4}
              className="font-medium"
            />
            <Button
              onClick={handleAddSymbol}
              disabled={loading || !newSymbol.trim() || symbols.length >= 4}
            >
              <Plus size={18} className="mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {symbols.length}/4 stocks added
          </p>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {symbols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-semibold">Metric</th>
                    {symbols.map((symbol, idx) => (
                      <th key={symbol} className="text-left py-3 px-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold" style={{ color: CHART_COLORS[idx] }}>
                            {symbol}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSymbol(symbol)}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">Current Price</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-semibold">
                          {data ? `$${data.price.toFixed(2)}` : '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">Change %</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      const change = Number(data?.changePercent) || 0
                      return (
                        <td key={symbol} className="py-3 px-2">
                          <span className={`font-semibold flex items-center gap-1 ${change >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                            {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">Market Cap</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.marketCap || '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">P/E Ratio</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.pe ? data.pe.toFixed(2) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">Dividend Yield</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.dividendYield ? `${data.dividendYield.toFixed(2)}%` : '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">52W High</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.high52w ? `$${data.high52w.toFixed(2)}` : '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-2 text-muted-foreground">52W Low</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.low52w ? `$${data.low52w.toFixed(2)}` : '-'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-muted-foreground">Volume</td>
                    {symbols.map((symbol) => {
                      const data = comparisonData[symbol]
                      return (
                        <td key={symbol} className="py-3 px-2 font-medium">
                          {data?.volume ? data.volume.toLocaleString() : '-'}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relative Performance Chart */}
      {symbols.length > 0 && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relative Performance (30 Days)</CardTitle>
            <CardDescription>Percentage change from starting point</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="index"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Change (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  {symbols.map((symbol, idx) => (
                    <Line
                      key={symbol}
                      type="monotone"
                      dataKey={symbol}
                      stroke={CHART_COLORS[idx]}
                      strokeWidth={2}
                      dot={false}
                      name={symbol}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {symbols.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="text-lg mb-2">No stocks to compare</p>
              <p className="text-sm">Add stocks using the input above to start comparing</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
