'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, StarOff, TrendingUp, TrendingDown, Plus, X } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'

interface WatchlistStock {
  symbol: string
  name: string
  price?: number
  change?: number
  changePercent?: number
}

interface WatchlistProps {
  onStockSelect?: (symbol: string) => void
}

export function Watchlist({ onStockSelect }: WatchlistProps) {
  const [watchlist, setWatchlist] = useLocalStorage<WatchlistStock[]>('quantpilot-watchlist', [])
  const [newSymbol, setNewSymbol] = useState('')
  const [adding, setAdding] = useState(false)
  const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: any }>({})

  // Fetch prices for watchlist stocks
  useEffect(() => {
    const fetchPrices = async () => {
      for (const stock of watchlist) {
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

    if (watchlist.length > 0) {
      fetchPrices()
      const interval = setInterval(fetchPrices, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [watchlist])

  const handleAddStock = async () => {
    if (!newSymbol.trim()) return

    const symbol = newSymbol.toUpperCase().trim()

    // Check if already in watchlist
    if (watchlist.find(s => s.symbol === symbol)) {
      setNewSymbol('')
      return
    }

    setAdding(true)
    try {
      const response = await fetch('/api/stocks/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })

      if (response.ok) {
        const data = await response.json()
        setWatchlist([
          ...watchlist,
          {
            symbol: data.symbol,
            name: data.symbol,
            price: data.price,
            change: data.change,
            changePercent: parseFloat(data.changePercent),
          }
        ])
        setNewSymbol('')
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveStock = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s.symbol !== symbol))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star size={20} className="text-amber-500" />
          Watchlist
        </CardTitle>
        <CardDescription>Stocks you're tracking</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add to Watchlist */}
        <div className="flex gap-2">
          <Input
            placeholder="Add symbol (e.g., AAPL)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddStock()
              }
            }}
            disabled={adding}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddStock}
            disabled={adding || !newSymbol.trim()}
          >
            <Plus size={16} />
          </Button>
        </div>

        {/* Watchlist Items */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {watchlist.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No stocks in watchlist. Add symbols to track them.
            </p>
          ) : (
            watchlist.map((stock) => {
              const currentPrice = updatedPrices[stock.symbol]?.price ?? stock.price
              const change = updatedPrices[stock.symbol]?.change ?? stock.change
              const changePercent = updatedPrices[stock.symbol]?.changePercent ?? stock.changePercent

              return (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted cursor-pointer"
                  onClick={() => onStockSelect?.(stock.symbol)}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{stock.symbol}</p>
                    {currentPrice && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium">${currentPrice.toFixed(2)}</p>
                        {change !== undefined && changePercent !== undefined && (
                          <span className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                            {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveStock(stock.symbol)
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
