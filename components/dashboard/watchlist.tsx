'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, StarOff, TrendingUp, TrendingDown, Plus, X } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { toast } from 'sonner'

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
    <Card className="border-2 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Star size={22} className="text-amber-500 fill-amber-500" />
          </div>
          Watchlist
        </CardTitle>
        <CardDescription className="text-sm">Stocks you're tracking</CardDescription>
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
            className="text-sm font-medium border-2 focus:border-primary"
          />
          <Button
            size="sm"
            onClick={handleAddStock}
            disabled={adding || !newSymbol.trim()}
            className="px-4 bg-primary hover:bg-primary/90 shadow-md"
          >
            <Plus size={18} />
          </Button>
        </div>

        {/* Watchlist Items */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {watchlist.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-lg bg-muted/30 border-2 border-dashed border-border">
              <Star size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">
                No stocks in watchlist
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add symbols to track them
              </p>
            </div>
          ) : (
            watchlist.map((stock) => {
              const currentPrice = updatedPrices[stock.symbol]?.price ?? stock.price
              const change = updatedPrices[stock.symbol]?.change ?? stock.change
              const changePercent = updatedPrices[stock.symbol]?.changePercent ?? stock.changePercent

              return (
                <div
                  key={stock.symbol}
                  className="group flex items-center justify-between p-4 rounded-lg border-2 border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/40 hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-md"
                  onClick={() => onStockSelect?.(stock.symbol)}
                >
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-base tracking-tight">{stock.symbol}</p>
                    {currentPrice && (
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-sm font-semibold text-foreground">${currentPrice.toFixed(2)}</p>
                        {change !== undefined && changePercent !== undefined && (
                          <span className={`text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${change >= 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-red-600 bg-red-500/10'}`}>
                            {change >= 0 ? <TrendingUp size={14} strokeWidth={2.5} /> : <TrendingDown size={14} strokeWidth={2.5} />}
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
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={18} strokeWidth={2} />
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
