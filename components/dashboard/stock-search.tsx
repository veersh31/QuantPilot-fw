'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Loader2 } from 'lucide-react'

interface StockInfo {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

// Stock symbols with company names
const STOCK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
]

export function StockSearch({ onStockSelect, onAddToPortfolio }: any) {
  const [search, setSearch] = useState('')
  const [stocks, setStocks] = useState<StockInfo[]>([])
  const [results, setResults] = useState<StockInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  // Fetch popular stocks data on mount
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true)
      try {
        const stockDataPromises = STOCK_SYMBOLS.map(async ({ symbol, name }) => {
          try {
            const response = await fetch('/api/stocks/quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol }),
            })

            if (!response.ok) throw new Error('Failed to fetch')

            const data = await response.json()
            return {
              symbol: data.symbol,
              name,
              price: data.price,
              change: data.change,
              changePercent: parseFloat(data.changePercent),
            }
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error)
            return null
          }
        })

        const stocksData = await Promise.all(stockDataPromises)
        const validStocks = stocksData.filter((stock): stock is StockInfo => stock !== null)
        setStocks(validStocks)
        setResults(validStocks)
      } catch (error) {
        console.error('Error fetching stock data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
  }, [])

  const handleSearch = async (value: string) => {
    setSearch(value)

    if (!value.trim()) {
      setResults(stocks)
      return
    }

    const searchUpper = value.toUpperCase()
    const symbolPattern = /^[A-Z]{1,5}$/i

    // First filter existing stocks
    const filtered = stocks.filter(
      stock => stock.symbol.includes(searchUpper) || stock.name.toLowerCase().includes(value.toLowerCase())
    )

    // Check if we have an exact symbol match in the filtered results
    const exactMatch = filtered.find(stock => stock.symbol === searchUpper)

    // If value looks like a symbol and we don't have an exact match, fetch it
    if (symbolPattern.test(value.trim()) && !exactMatch) {
      setSearching(true)
      try {
        const response = await fetch('/api/stocks/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: searchUpper }),
        })

        if (response.ok) {
          const data = await response.json()
          const newStock: StockInfo = {
            symbol: data.symbol,
            name: data.symbol, // We don't have the full name from quote API
            price: data.price,
            change: data.change,
            changePercent: parseFloat(data.changePercent),
          }
          // Show the exact match first, then other filtered results
          setResults([newStock, ...filtered.filter(s => s.symbol !== newStock.symbol)])
        } else {
          // If fetch fails, just show filtered results
          setResults(filtered)
        }
      } catch (error) {
        console.error('Error searching stock:', error)
        setResults(filtered)
      } finally {
        setSearching(false)
      }
    } else {
      setResults(filtered)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Search</CardTitle>
        <CardDescription>Search and add stocks to your portfolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <Input
            placeholder="Search by symbol or name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="animate-spin mr-2" size={18} />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}
            {!searching && results.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {search ? 'No stocks found. Try entering a valid stock symbol (e.g., PLTR, A)' : 'No stocks found'}
              </p>
            ) : (
              results.map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted cursor-pointer"
                  onClick={() => onStockSelect(stock.symbol)}
                >
                  <div>
                    <p className="font-semibold text-foreground">{stock.symbol}</p>
                    <p className="text-sm text-muted-foreground">{stock.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${stock.price.toFixed(2)}</p>
                      <p className={`text-sm ${stock.change >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToPortfolio({ ...stock, quantity: 1, avgCost: stock.price })
                      }}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
