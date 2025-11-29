'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, AlertCircle, Clock } from 'lucide-react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export function PortfolioOverview({ portfolio }: { portfolio: any[] }) {
  const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Fetch real-time prices for portfolio stocks
  useEffect(() => {
    const fetchPrices = async () => {
      if (portfolio.length === 0) return

      setLoading(true)
      try {
        for (const stock of portfolio) {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol }),
          })

          if (response.ok) {
            const data = await response.json()
            setUpdatedPrices(prev => ({
              ...prev,
              [stock.symbol]: data.price
            }))
          }
        }
      } catch (error) {
        console.error('Error fetching portfolio prices:', error)
      } finally {
        setLoading(false)
        setLastUpdate(new Date())
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [portfolio])

  const totalValue = portfolio.reduce((sum, stock) => {
    const currentPrice = updatedPrices[stock.symbol] ?? stock.price ?? 0
    return sum + currentPrice * (stock.quantity || 1)
  }, 0)

  const costBasis = portfolio.reduce((sum, stock) => sum + (stock.avgCost * (stock.quantity || 1)), 0)
  const gainLoss = totalValue - costBasis
  const gainLossPercent = costBasis > 0 ? ((gainLoss / costBasis) * 100) : 0

  const todayGainLoss = portfolio.reduce((sum, stock) => {
    const currentPrice = updatedPrices[stock.symbol] ?? stock.price ?? 0
    return sum + (stock.change || 0) * (stock.quantity || 1)
  }, 0)

  // Calculate portfolio allocation
  const allocationData = portfolio.map(stock => {
    const currentPrice = updatedPrices[stock.symbol] ?? stock.price ?? 0
    const stockValue = currentPrice * (stock.quantity || 1)
    const percentage = totalValue > 0 ? (stockValue / totalValue) * 100 : 0

    return {
      name: stock.symbol,
      value: stockValue,
      percentage: percentage,
      shares: stock.quantity || 1
    }
  }).sort((a, b) => b.value - a.value) // Sort by value descending

  // Colors for pie chart
  const COLORS = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042',
    '#a4de6c'
  ]

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Portfolio Overview
        </CardTitle>
        <CardDescription>
          Portfolio summary {portfolio.length > 0 && `• ${portfolio.length} position${portfolio.length !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {portfolio.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={16} />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  DATA DELAYED UP TO 15 MIN - NOT REAL-TIME
                </p>
              </div>
              {lastUpdate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock size={12} />
                  {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              )}
            </div>
          </div>
        )}
        {portfolio.length === 0 ? (
          <div className="text-center py-8">
            <PieChart className="mx-auto mb-3 text-muted-foreground" size={48} />
            <p className="text-sm text-muted-foreground">Add stocks to your portfolio to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <p className="text-xs font-medium uppercase">Total Value</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Cost Basis</p>
                <p className="text-2xl font-bold">
                  ${costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Total Gain/Loss</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {gainLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                  )}
                </div>
                <p className={`text-sm mt-1 ${gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Today's Change</p>
                <p className={`text-2xl font-bold ${todayGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {todayGainLoss >= 0 ? '+' : ''}${todayGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {loading && (
              <p className="text-xs text-muted-foreground text-center">Updating prices...</p>
            )}

            {/* Portfolio Diversification Pie Chart */}
            {portfolio.length > 0 && (
              <Card className="border-muted">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Portfolio Allocation
                  </CardTitle>
                  <CardDescription>Distribution by position value</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="h-[300px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={110}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={600}
                          >
                            {allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              padding: '12px',
                              color: 'hsl(var(--card-foreground))'
                            }}
                            formatter={(value: any, name: string, props: any) => [
                              `$${Number(value).toFixed(2)} (${props.payload.percentage.toFixed(1)}%)`,
                              props.payload.name
                            ]}
                          />
                          <Legend
                            verticalAlign="middle"
                            align="right"
                            layout="vertical"
                            iconType="circle"
                            formatter={(value, entry: any) => (
                              <span className="text-sm">
                                <span className="font-semibold">{value}</span>
                                <span className="text-muted-foreground ml-2">
                                  {entry.payload.percentage.toFixed(1)}%
                                </span>
                              </span>
                            )}
                            wrapperStyle={{
                              paddingLeft: '20px',
                              fontSize: '14px'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Allocation Table */}
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase mb-3">Holdings Breakdown</div>
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2">
                        {allocationData.map((item, index) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ background: COLORS[index % COLORS.length] }}
                              />
                              <div>
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.shares} shares</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{item.percentage.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">${item.value.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Diversification Score */}
                      <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase">Diversification</span>
                          <span className={`text-sm font-bold ${
                            portfolio.length >= 10 ? 'text-emerald-600 dark:text-emerald-500' :
                            portfolio.length >= 5 ? 'text-primary' :
                            portfolio.length >= 3 ? 'text-amber-600 dark:text-amber-500' :
                            'text-red-600 dark:text-red-500'
                          }`}>
                            {portfolio.length >= 10 ? 'Well Diversified' :
                             portfolio.length >= 5 ? 'Moderate' :
                             portfolio.length >= 3 ? 'Concentrated' : 'High Risk'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {portfolio.length} position{portfolio.length !== 1 ? 's' : ''} •
                          {allocationData[0] ? ` Largest: ${allocationData[0].percentage.toFixed(1)}%` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
