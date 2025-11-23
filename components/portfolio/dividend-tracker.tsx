'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DividendData {
  symbol: string
  quantity: number
  annualDividend: number
  dividendYield: number
  quarterlyDividend: number
  nextExDate?: string
  paymentDate?: string
}

interface PortfolioStock {
  symbol: string
  name: string
  quantity: number
  avgCost: number
  price: number
}

interface DividendTrackerProps {
  portfolio: PortfolioStock[]
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function DividendTracker({ portfolio }: DividendTrackerProps) {
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAnnualDividends, setTotalAnnualDividends] = useState(0)
  const [totalQuarterlyDividends, setTotalQuarterlyDividends] = useState(0)
  const [portfolioYield, setPortfolioYield] = useState(0)

  useEffect(() => {
    const fetchDividendData = async () => {
      setLoading(true)
      const dividends: DividendData[] = []
      let totalAnnual = 0
      let totalQuarterly = 0
      let totalPortfolioValue = 0

      for (const stock of portfolio) {
        try {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol }),
          })

          if (response.ok) {
            const data = await response.json()
            const dividendYield = data.dividendYield || 0

            // Calculate annual dividend based on current price and yield
            const annualDividend = (stock.price * (dividendYield / 100) * stock.quantity)
            const quarterlyDividend = annualDividend / 4

            if (dividendYield > 0) {
              dividends.push({
                symbol: stock.symbol,
                quantity: stock.quantity,
                annualDividend,
                dividendYield,
                quarterlyDividend,
              })

              totalAnnual += annualDividend
              totalQuarterly += quarterlyDividend
            }

            totalPortfolioValue += stock.price * stock.quantity
          }
        } catch (error) {
          console.error(`Error fetching dividend data for ${stock.symbol}:`, error)
        }
      }

      setDividendData(dividends)
      setTotalAnnualDividends(totalAnnual)
      setTotalQuarterlyDividends(totalQuarterly)
      setPortfolioYield(totalPortfolioValue > 0 ? (totalAnnual / totalPortfolioValue) * 100 : 0)
      setLoading(false)
    }

    if (portfolio.length > 0) {
      fetchDividendData()
    } else {
      setLoading(false)
    }
  }, [portfolio])

  // Prepare data for charts
  const barChartData = dividendData.map(d => ({
    symbol: d.symbol,
    annual: parseFloat(d.annualDividend.toFixed(2)),
    quarterly: parseFloat(d.quarterlyDividend.toFixed(2)),
  }))

  const pieChartData = dividendData.map(d => ({
    name: d.symbol,
    value: parseFloat(d.annualDividend.toFixed(2)),
  }))

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Loading dividend data...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (portfolio.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividend Tracker</CardTitle>
          <CardDescription>Track dividend income from your holdings</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
            <p>No portfolio holdings</p>
            <p className="text-sm mt-2">Add stocks to track dividend income</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (dividendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividend Tracker</CardTitle>
          <CardDescription>Track dividend income from your holdings</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
            <p>No dividend-paying stocks in portfolio</p>
            <p className="text-sm mt-2">Add dividend stocks to track income</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign size={16} />
              Annual Dividend Income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              ${totalAnnualDividends.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Projected yearly income
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar size={16} />
              Quarterly Dividend Income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalQuarterlyDividends.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Average per quarter
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Percent size={16} />
              Portfolio Yield
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {portfolioYield.toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Weighted average yield
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dividend by Stock - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Dividend by Stock</CardTitle>
          <CardDescription>Expected dividend income per holding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="symbol"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: 'Annual Dividend ($)', angle: -90, position: 'insideLeft' }}
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
                <Bar dataKey="annual" fill="#3b82f6" name="Annual Dividend" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Dividend Distribution - Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dividend Distribution</CardTitle>
            <CardDescription>Income breakdown by stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dividend Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Dividend Details</CardTitle>
            <CardDescription>Per-stock breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {dividendData.map((stock) => (
                <div
                  key={stock.symbol}
                  className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-foreground">{stock.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {stock.quantity} shares
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Yield</p>
                      <p className="font-semibold text-chart-1">
                        {stock.dividendYield.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Annual Income</p>
                      <p className="font-semibold">
                        ${stock.annualDividend.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Income Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Income Projection
          </CardTitle>
          <CardDescription>Estimated monthly dividend income</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
              const monthlyIncome = totalAnnualDividends / 12
              return (
                <div
                  key={month}
                  className="flex flex-col items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs text-muted-foreground mb-1">{month}</span>
                  <span className="text-xs font-semibold">
                    ${monthlyIncome.toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Monthly Income</span>
              <span className="text-lg font-bold text-primary">
                ${(totalAnnualDividends / 12).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
