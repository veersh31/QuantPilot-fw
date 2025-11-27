'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStockData } from '@/hooks/use-stock-data'
import { TrendingUp, TrendingDown, Loader2, Clock, AlertCircle } from 'lucide-react'
import { TooltipHelp, FinancialTooltips } from '@/components/ui/tooltip-help'

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return 'Just now'

  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

export function StockQuote({ symbol }: { symbol: string | null }) {
  const { data, loading } = useStockData(symbol)

  if (!symbol) {
    return null
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <Loader2 className="animate-spin" size={24} />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card className="relative overflow-hidden border-none shadow-2xl animate-in slide-in-from-top-4 duration-500">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-background" />

      <CardHeader className="relative">
        {/* Data Delay Warning - Modern Design */}
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500/20">
              <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                DATA MAY BE DELAYED UP TO 15 MINUTES
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yahoo Finance free tier - not real-time market data
              </p>
            </div>
          </div>
        </div>

        {/* Price Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">{data.symbol}</span>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${data.change >= 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent}%)
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={14} className="animate-pulse" />
              {formatTimestamp(data.timestamp)}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              ${data.price.toFixed(2)}
            </span>
            {data.change >= 0 ? (
              <TrendingUp className="text-emerald-500 mb-2 animate-bounce" size={32} />
            ) : (
              <TrendingDown className="text-red-500 mb-2 animate-bounce" size={32} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* 52-Week Range Slider */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">52-Week Range</p>
          <div className="relative pt-2 pb-4">
            {/* Range Bar */}
            <div className="h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full relative">
              {/* Current Price Indicator */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{
                  left: `${((data.price - data.low52w) / (data.high52w - data.low52w)) * 100}%`
                }}
              >
                <div className="w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-lg animate-pulse" />
              </div>
            </div>
            {/* Range Labels */}
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-red-500 font-bold">${data.low52w.toFixed(2)}</span>
              <span className="text-muted-foreground font-medium">Current: ${data.price.toFixed(2)}</span>
              <span className="text-emerald-500 font-bold">${data.high52w.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid - Enhanced with more metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="group p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              Market Cap
              <TooltipHelp {...FinancialTooltips.marketCap} />
            </p>
            <p className="text-xl font-bold">{data.marketCap}</p>
            <p className="text-xs text-muted-foreground mt-1">Company Size</p>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              P/E Ratio
              <TooltipHelp {...FinancialTooltips.pe} />
            </p>
            <p className="text-xl font-bold">{data.pe.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Price to Earnings</p>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              Dividend Yield
              <TooltipHelp {...FinancialTooltips.dividendYield} />
            </p>
            <p className="text-xl font-bold">{(data.dividendYield * 100).toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Annual Payout</p>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              Volume
              <TooltipHelp {...FinancialTooltips.volume} />
            </p>
            <p className="text-xl font-bold">{(data.volume / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-muted-foreground mt-1">Shares Traded</p>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-pink-500/5 to-pink-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              52W High
              <TooltipHelp {...FinancialTooltips.fiftyTwoWeekHigh} />
            </p>
            <p className="text-xl font-bold">${data.high52w.toFixed(2)}</p>
            <p className="text-xs text-emerald-500 mt-1 font-medium">
              {((data.price / data.high52w - 1) * 100).toFixed(1)}% from high
            </p>
          </div>

          <div className="group p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200 hover:shadow-md">
            <p className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center">
              52W Low
              <TooltipHelp {...FinancialTooltips.fiftyTwoWeekLow} />
            </p>
            <p className="text-xl font-bold">${data.low52w.toFixed(2)}</p>
            <p className="text-xs text-emerald-500 mt-1 font-medium">
              +{((data.price / data.low52w - 1) * 100).toFixed(1)}% from low
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
