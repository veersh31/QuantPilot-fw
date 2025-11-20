'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Wallet, PieChart } from 'lucide-react'

export function PortfolioOverview({ portfolio }: { portfolio: any[] }) {
  const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(false)

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet size={24} />
          Portfolio Overview
        </CardTitle>
        <CardDescription>
          Real-time portfolio summary {portfolio.length > 0 && `• ${portfolio.length} position${portfolio.length !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
