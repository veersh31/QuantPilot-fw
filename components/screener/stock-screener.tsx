'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, TrendingUp, TrendingDown, Plus, X, Zap, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { STOCK_UNIVERSES, SCREENER_PRESETS, StockUniverse, ScreenerPreset } from '@/lib/stock-universe'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ScreenerFilters {
  minMarketCap: number
  maxMarketCap: number
  minPE: number
  maxPE: number
  minDividendYield: number
  maxDividendYield: number
  minPrice: number
  maxPrice: number
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

export function StockScreener() {
  const [selectedUniverse, setSelectedUniverse] = useState<StockUniverse>('S&P 500 Top 100')
  const [filters, setFilters] = useState<ScreenerFilters>({
    minMarketCap: 0,
    maxMarketCap: 10000,
    minPE: 0,
    maxPE: 100,
    minDividendYield: 0,
    maxDividendYield: 10,
    minPrice: 0,
    maxPrice: 1000
  })

  const [results, setResults] = useState<ScreenedStock[]>([])
  const [loading, setLoading] = useState(false)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const parseMarketCap = (marketCapStr: string): number => {
    if (!marketCapStr) return 0

    const value = parseFloat(marketCapStr.replace(/[^0-9.]/g, ''))

    if (marketCapStr.includes('T')) return value * 1000 // Trillions to billions
    if (marketCapStr.includes('B')) return value
    if (marketCapStr.includes('M')) return value / 1000 // Millions to billions

    return value / 1000000000 // Convert raw number to billions
  }

  const applyPreset = (preset: ScreenerPreset) => {
    setFilters(preset.filters)
    setSelectedUniverse(preset.universe)
    toast.success(`Applied preset: ${preset.name}`)
  }

  const runScreener = async () => {
    const tickersToScreen = STOCK_UNIVERSES[selectedUniverse]

    setLoading(true)
    setSearchPerformed(true)
    setProgress({ current: 0, total: tickersToScreen.length })
    const screenedStocks: ScreenedStock[] = []

    try {
      toast.info(`Scanning ${tickersToScreen.length} ${selectedUniverse} stocks...`)

      // Fetch data for all tickers and filter based on criteria
      for (let i = 0; i < tickersToScreen.length; i++) {
        const symbol = tickersToScreen[i]
        setProgress({ current: i + 1, total: tickersToScreen.length })

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
            const dividendYield = (data.dividendYield || 0) * 100 // Convert to percentage
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
      toast.success(`Found ${screenedStocks.length} of ${tickersToScreen.length} stocks matching criteria`)
    } catch (error) {
      console.error('Error running screener:', error)
      toast.error('Failed to run screener')
    }

    setLoading(false)
    setProgress({ current: 0, total: 0 })
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
      maxPrice: 1000
    })
    setResults([])
    setSearchPerformed(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stock Universe Selection */}
      <Card className="border-blue-500/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Zap className="text-blue-500" size={24} />
            Stock Screener
          </CardTitle>
          <CardDescription className="text-base">
            Automatically discover stocks matching your criteria across {STOCK_UNIVERSES[selectedUniverse].length} stocks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Stock Universe</Label>
            <Select value={selectedUniverse} onValueChange={(value) => setSelectedUniverse(value as StockUniverse)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STOCK_UNIVERSES).map((universe) => (
                  <SelectItem key={universe} value={universe}>
                    {universe} ({STOCK_UNIVERSES[universe as StockUniverse].length} stocks)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {SCREENER_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="hover:bg-blue-500/10 hover:border-blue-500/40"
                >
                  <Zap size={14} className="mr-1.5" />
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Screening Criteria
          </CardTitle>
          <CardDescription>Set your filters to discover matching stocks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Market Cap Filter */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <Label className="text-sm font-semibold mb-3 block">
              💰 Market Cap: ${filters.minMarketCap}B - ${filters.maxMarketCap}B
            </Label>
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

          {/* P/E Ratio Filter */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <Label className="text-sm font-semibold mb-3 block">
              📊 P/E Ratio: {filters.minPE} - {filters.maxPE}
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
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <Label className="text-sm font-semibold mb-3 block">
              💵 Dividend Yield: {filters.minDividendYield}% - {filters.maxDividendYield}%
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
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <Label className="text-sm font-semibold mb-3 block">
              💲 Price Range: ${filters.minPrice} - ${filters.maxPrice}
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
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Screening... {progress.current}/{progress.total}
                </>
              ) : (
                <>
                  <Search size={18} className="mr-2" />
                  Scan {STOCK_UNIVERSES[selectedUniverse].length} Stocks
                </>
              )}
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              disabled={loading}
              size="lg"
            >
              <X size={18} className="mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <Card className="border-blue-500/20">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <div className="mb-4">
                <RefreshCw size={48} className="mx-auto opacity-30 animate-spin" />
              </div>
              <p className="text-lg font-semibold">Scanning {selectedUniverse}...</p>
              <p className="text-sm mt-2">Analyzing {progress.current} of {progress.total} stocks</p>
              <div className="w-full max-w-md mx-auto mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && searchPerformed && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🎯 Screener Results</span>
              <Badge variant="secondary" className="text-base px-4 py-1">
                {results.length} stocks found
              </Badge>
            </CardTitle>
            <CardDescription>
              {results.length} stock{results.length !== 1 ? 's' : ''} matching your criteria from {selectedUniverse}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold">No stocks match your criteria</p>
                <p className="text-sm mt-2">Try adjusting your filters or selecting a different universe</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="group p-5 rounded-xl border border-border hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-xl">{stock.symbol}</h3>
                          <Badge
                            variant={stock.changePercent >= 0 ? 'default' : 'destructive'}
                            className="flex items-center gap-1"
                          >
                            {stock.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </Badge>
                        </div>
                        <p className="text-3xl font-bold mt-2">${stock.price.toFixed(2)}</p>
                      </div>
                      <Button size="sm" className="group-hover:scale-105 transition-transform">
                        <Plus size={16} className="mr-1" />
                        Add to Portfolio
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                        <p className="font-bold text-base">{stock.marketCap}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">P/E Ratio</p>
                        <p className="font-bold text-base">{stock.pe ? stock.pe.toFixed(2) : 'N/A'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Div Yield</p>
                        <p className="font-bold text-base">
                          {stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)}%` : 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Volume</p>
                        <p className="font-bold text-base">{(stock.volume / 1000000).toFixed(2)}M</p>
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
        <Card className="border-purple-500/20 shadow-lg">
          <CardContent className="py-16">
            <div className="text-center text-muted-foreground">
              <Zap size={56} className="mx-auto mb-4 text-purple-500" />
              <p className="text-xl font-semibold mb-2">Ready to discover stocks</p>
              <p className="text-sm mb-4">
                Select a universe, set your criteria, and click "Scan {STOCK_UNIVERSES[selectedUniverse].length} Stocks"
              </p>
              <p className="text-xs text-muted-foreground">
                Or try a quick preset: {SCREENER_PRESETS.map(p => p.name).join(' • ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
