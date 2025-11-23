'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, TrendingDown, Trash2, Edit2, Check, X, Download } from 'lucide-react'
import { exportPortfolioToCSV } from '@/lib/export-utils'
import { toast } from 'sonner'

interface PortfolioStock {
  symbol: string
  name: string
  quantity: number
  avgCost: number
  price: number
  change: number
  changePercent: number
}

interface PortfolioHoldingsProps {
  portfolio: PortfolioStock[]
  onUpdateQuantity: (symbol: string, newQuantity: number) => void
  onRemoveStock: (symbol: string) => void
}

export function PortfolioHoldings({ portfolio, onUpdateQuantity, onRemoveStock }: PortfolioHoldingsProps) {
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: any }>({})

  // Fetch real-time prices for portfolio stocks
  useEffect(() => {
    const fetchPrices = async () => {
      for (const stock of portfolio) {
        try {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol }),
          })

          if (response.ok) {
            const data = await response.json()
            setUpdatedPrices(prev => ({
              ...prev,
              [stock.symbol]: {
                price: data.price,
                change: data.change,
                changePercent: parseFloat(data.changePercent),
              }
            }))
          }
        } catch (error) {
          console.error(`Error fetching price for ${stock.symbol}:`, error)
        }
      }
    }

    if (portfolio.length > 0) {
      fetchPrices()
      const interval = setInterval(fetchPrices, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [portfolio])

  const handleStartEdit = (stock: PortfolioStock) => {
    setEditingSymbol(stock.symbol)
    setEditQuantity(stock.quantity)
  }

  const handleSaveEdit = (symbol: string) => {
    if (editQuantity > 0) {
      onUpdateQuantity(symbol, editQuantity)
    }
    setEditingSymbol(null)
  }

  const handleCancelEdit = () => {
    setEditingSymbol(null)
    setEditQuantity(0)
  }

  if (portfolio.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
          <CardDescription>Your stock positions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No holdings yet. Add stocks from the search tab to get started!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>{portfolio.length} position{portfolio.length !== 1 ? 's' : ''} in your portfolio</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPortfolioToCSV(portfolio)}
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {portfolio.map((stock) => {
            const currentPrice = updatedPrices[stock.symbol]?.price ?? stock.price
            const change = updatedPrices[stock.symbol]?.change ?? stock.change
            const changePercent = updatedPrices[stock.symbol]?.changePercent ?? stock.changePercent

            const costBasis = stock.avgCost * stock.quantity
            const currentValue = currentPrice * stock.quantity
            const totalGainLoss = currentValue - costBasis
            const totalGainLossPercent = ((totalGainLoss / costBasis) * 100)

            const isEditing = editingSymbol === stock.symbol

            return (
              <div
                key={stock.symbol}
                className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-foreground">{stock.symbol}</h3>
                      <span className={`text-sm flex items-center gap-1 ${change >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                        {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{stock.name}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(stock)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveStock(stock.symbol)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Shares</p>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                          className="h-7 w-20"
                          min="0"
                          step="0.01"
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(stock.symbol)} className="h-7 w-7 p-0">
                          <Check size={14} className="text-chart-1" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 w-7 p-0">
                          <X size={14} className="text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <p className="font-semibold">{stock.quantity.toFixed(2)}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-muted-foreground">Avg Cost</p>
                    <p className="font-semibold">${stock.avgCost.toFixed(2)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-semibold">${currentPrice.toFixed(2)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Market Value</p>
                    <p className="font-semibold">${currentValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Gain/Loss</p>
                      <p className={`font-semibold ${totalGainLoss >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                        {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)} ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Cost Basis</p>
                      <p className="font-semibold text-muted-foreground">${costBasis.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
