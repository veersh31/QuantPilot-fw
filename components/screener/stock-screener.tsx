'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Search, Filter, TrendingUp, TrendingDown, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ScreenerFilters {
  minMarketCap: number
  maxMarketCap: number
  minPE: number
  maxPE: number
  minDividendYield: number
  maxDividendYield: number
  minPrice: number
  maxPrice: number
  sector: string
}

interface ScreenedStock {
  symbol: string
  name?: string
  price: number
  change: number
  changePercent: number
  marketCap: string
  pe: number
  dividendYield: number
  volume: number
}

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'PYPL', 'INTC', 'CSCO', 'ADBE', 'CRM', 'ORCL',
  'IBM', 'QCOM', 'TXN', 'AVGO', 'COST', 'PEP', 'KO', 'WMT',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'V', 'MA',
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'DHR', 'MDT', 'BMY',
  'XOM', 'CVX', 'COP', 'SLB', 'OXY', 'PSX', 'VLO', 'MPC'
]

const SECTORS = [
  'All Sectors',
  'Technology',
  'Healthcare',
  'Financial',
  'Consumer',
  'Energy',
  'Industrial',
  'Materials',
  'Utilities',
  'Real Estate'
]

export function StockScreener() {
  const [filters, setFilters] = useState<ScreenerFilters>({
    minMarketCap: 0,
    maxMarketCap: 10000,
    minPE: 0,
    maxPE: 100,
    minDividendYield: 0,
    maxDividendYield: 10,
    minPrice: 0,
    maxPrice: 1000,
    sector: 'All Sectors'
  })

  const [results, setResults] = useState<ScreenedStock[]>([])
  const [loading, setLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)

  const parseMarketCap = (marketCapStr: string): number => {
    if (!marketCapStr) return 0

    const value = parseFloat(marketCapStr.replace(/[^0-9.]/g, ''))

    if (marketCapStr.includes('T')) return value * 1000 // Trillions to billions
    if (marketCapStr.includes('B')) return value
    if (marketCapStr.includes('M')) return value / 1000 // Millions to billions

    return value / 1000000000 // Convert raw number to billions
  }

  const runScreener = async () => {
    setLoading(true)
    setSearchPerformed(true)
    const screenedStocks: ScreenedStock[] = []

    try {
      // Fetch data for popular stocks and filter based on criteria
      for (const symbol of POPULAR_STOCKS) {
        try {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol }),
          })

          if (response.ok) {
            const data = await response.json()

            // Parse market cap
            const marketCapBillions = parseMarketCap(data.marketCap)
            const pe = data.pe || 0
            const dividendYield = data.dividendYield || 0
            const price = data.price || 0

            // Apply filters
            const passesMarketCap = marketCapBillions >= filters.minMarketCap && marketCapBillions <= filters.maxMarketCap
            const passesPE = pe >= filters.minPE && pe <= filters.maxPE
            const passesDividendYield = dividendYield >= filters.minDividendYield && dividendYield <= filters.maxDividendYield
            const passesPrice = price >= filters.minPrice && price <= filters.maxPrice

            if (passesMarketCap && passesPE && passesDividendYield && passesPrice) {
              screenedStocks.push({
                symbol: data.symbol,
                name: data.symbol,
                price: data.price,
                change: data.change,
                changePercent: Number(data.changePercent) || 0,
                marketCap: data.marketCap,
                pe: data.pe,
                dividendYield: data.dividendYield,
                volume: data.volume
              })
            }
          }
        } catch (error) {
          console.error(`Error screening ${symbol}:`, error)
        }
      }

      setResults(screenedStocks)
      toast.success(`Found ${screenedStocks.length} stocks matching criteria`)
    } catch (error) {
      console.error('Error running screener:', error)
      toast.error('Failed to run screener')
    }

    setLoading(false)
  }

  const resetFilters = () => {
    setFilters({
      minMarketCap: 0,
      maxMarketCap: 10000,
      minPE: 0,
      maxPE: 100,
      minDividendYield: 0,
      maxDividendYield: 10,
      minPrice: 0,
      maxPrice: 1000,
      sector: 'All Sectors'
    })
    setResults([])
    setSearchPerformed(false)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Stock Screener
          </CardTitle>
          <CardDescription>Find stocks that match your investment criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Market Cap Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Market Cap (Billions): ${filters.minMarketCap}B - ${filters.maxMarketCap}B
            </Label>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Min ($B)</Label>
                  <Input
                    type="number"
                    value={filters.minMarketCap}
                    onChange={(e) => setFilters({ ...filters, minMarketCap: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Max ($B)</Label>
                  <Input
                    type="number"
                    value={filters.maxMarketCap}
                    onChange={(e) => setFilters({ ...filters, maxMarketCap: parseFloat(e.target.value) || 10000 })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* P/E Ratio Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              P/E Ratio: {filters.minPE} - {filters.maxPE}
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Min P/E</Label>
                <Input
                  type="number"
                  value={filters.minPE}
                  onChange={(e) => setFilters({ ...filters, minPE: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Max P/E</Label>
                <Input
                  type="number"
                  value={filters.maxPE}
                  onChange={(e) => setFilters({ ...filters, maxPE: parseFloat(e.target.value) || 100 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Dividend Yield Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Dividend Yield: {filters.minDividendYield}% - {filters.maxDividendYield}%
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Min Yield (%)</Label>
                <Input
                  type="number"
                  value={filters.minDividendYield}
                  onChange={(e) => setFilters({ ...filters, minDividendYield: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  step="0.1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Max Yield (%)</Label>
                <Input
                  type="number"
                  value={filters.maxDividendYield}
                  onChange={(e) => setFilters({ ...filters, maxDividendYield: parseFloat(e.target.value) || 10 })}
                  className="mt-1"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Price Range Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Price Range: ${filters.minPrice} - ${filters.maxPrice}
            </Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Min Price ($)</Label>
                <Input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Max Price ($)</Label>
                <Input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseFloat(e.target.value) || 1000 })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={runScreener}
              disabled={loading}
              className="flex-1"
            >
              <Search size={18} className="mr-2" />
              {loading ? 'Screening...' : 'Run Screener'}
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              disabled={loading}
            >
              <X size={18} className="mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <div className="animate-pulse mb-4">
                <Search size={48} className="mx-auto opacity-30" />
              </div>
              <p>Screening stocks...</p>
              <p className="text-sm mt-2">Analyzing {POPULAR_STOCKS.length} stocks</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && searchPerformed && (
        <Card>
          <CardHeader>
            <CardTitle>Screener Results</CardTitle>
            <CardDescription>
              {results.length} stock{results.length !== 1 ? 's' : ''} found matching your criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No stocks match your criteria</p>
                <p className="text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{stock.symbol}</h3>
                          <span className={`text-sm flex items-center gap-1 ${stock.changePercent >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                            {stock.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-2xl font-bold mt-1">${stock.price.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Plus size={16} className="mr-1" />
                        Add
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Market Cap</p>
                        <p className="font-semibold">{stock.marketCap}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">P/E Ratio</p>
                        <p className="font-semibold">{stock.pe ? stock.pe.toFixed(2) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Div Yield</p>
                        <p className="font-semibold">
                          {stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Volume</p>
                        <p className="font-semibold">{stock.volume.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && !searchPerformed && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Filter size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Ready to screen stocks</p>
              <p className="text-sm">Set your filters above and click "Run Screener"</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
