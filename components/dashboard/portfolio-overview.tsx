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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet size={24} />
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign size={16} />
                  <p className="text-sm">Total Value</p>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Cost Basis</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  ${costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Gain/Loss</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                    {gainLoss >= 0 ? '+' : ''}${gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {gainLoss >= 0 ? (
                    <TrendingUp className="text-chart-1" size={20} />
                  ) : (
                    <TrendingDown className="text-destructive" size={20} />
                  )}
                </div>
                <p className={`text-sm ${gainLoss >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Today's Change</p>
                <p className={`text-2xl font-bold ${todayGainLoss >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  {todayGainLoss >= 0 ? '+' : ''}${todayGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {loading && (
              <p className="text-xs text-muted-foreground text-center">Updating prices...</p>
            )}

            {/* Portfolio Diversification Pie Chart */}
            {portfolio.length > 0 && (
              <Card className="mt-6 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart size={20} className="text-blue-500" />
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
                            labelLine={false}
                            label={({name, percentage}) => `${name} ${percentage.toFixed(1)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={800}
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
                              color: 'var(--color-card-foreground)'
                            }}
                            formatter={(value: any) => [`$${value.toFixed(2)}`, 'Value']}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Allocation Table */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground mb-3">Holdings Breakdown</div>
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2">
                        {allocationData.map((item, index) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ background: COLORS[index % COLORS.length] }}
                              />
                              <div>
                                <p className="font-bold text-sm">{item.name}</p>
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
                      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Diversification</span>
                          <span className="text-sm font-bold text-blue-500">
                            {portfolio.length >= 10 ? 'Well Diversified' :
                             portfolio.length >= 5 ? 'Moderate' :
                             portfolio.length >= 3 ? 'Concentrated' : 'High Risk'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
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
