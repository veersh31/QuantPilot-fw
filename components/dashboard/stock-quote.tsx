'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useStockData } from '@/hooks/use-stock-data'
import { TrendingUp, TrendingDown, Loader2, Clock, AlertCircle } from 'lucide-react'
import { TooltipHelp, FinancialTooltips } from '@/components/ui/tooltip-help'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
      <Card className="border-muted">
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const rangePercentage = ((data.price - data.low52w) / (data.high52w - data.low52w)) * 100

  return (
    <Card className="border-muted">
      <CardHeader className="pb-4">
        {/* Data Delay Warning */}
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-600 dark:text-amber-500 flex-shrink-0" size={16} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-500">
                DATA MAY BE DELAYED UP TO 15 MINUTES
              </p>
              <p className="text-xs text-muted-foreground">
                Yahoo Finance free tier - not real-time market data
              </p>
            </div>
          </div>
        </div>

        {/* Price Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight">{data.symbol}</h2>
                {data.quoteType === 'ETF' && (
                  <Badge variant="outline" className="text-xs">ETF</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold tracking-tight">
                  ${data.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-1.5">
                  {data.change >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                  )}
                  <span className={`text-lg font-semibold ${data.change >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>{formatTimestamp(data.timestamp)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 52-Week Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase">52-Week Range</p>
            <p className="text-xs font-medium text-muted-foreground">
              {rangePercentage.toFixed(0)}% of range
            </p>
          </div>
          <div className="space-y-2">
            {/* Range Bar */}
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                style={{ width: `${rangePercentage}%` }}
              />
              {/* Current Price Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary border-2 border-background rounded-full shadow-sm"
                style={{ left: `${rangePercentage}%` }}
              />
            </div>
            {/* Range Labels */}
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                Low: ${data.low52w.toFixed(2)}
              </span>
              <span className="font-semibold text-muted-foreground">
                High: ${data.high52w.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase">
              Market Cap
              <TooltipHelp {...FinancialTooltips.marketCap} />
            </p>
            <p className="text-xl font-bold">{data.marketCap}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase">
              P/E Ratio
              <TooltipHelp {...FinancialTooltips.pe} />
            </p>
            <p className="text-xl font-bold">{data.pe > 0 ? data.pe.toFixed(2) : 'N/A'}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase">
              Dividend Yield
              <TooltipHelp {...FinancialTooltips.dividendYield} />
            </p>
            <p className="text-xl font-bold">
              {data.dividendYield > 0 ? `${(data.dividendYield * 100).toFixed(2)}%` : 'N/A'}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase">
              Volume
              <TooltipHelp {...FinancialTooltips.volume} />
            </p>
            <p className="text-xl font-bold">
              {data.volume > 1000000
                ? `${(data.volume / 1000000).toFixed(2)}M`
                : `${(data.volume / 1000).toFixed(0)}K`
              }
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center uppercase">
              Avg Volume
              <TooltipHelp {...FinancialTooltips.volume} />
            </p>
            <p className="text-xl font-bold">
              {data.avgVolume > 1000000
                ? `${(data.avgVolume / 1000000).toFixed(2)}M`
                : `${(data.avgVolume / 1000).toFixed(0)}K`
              }
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1 uppercase">
              From High
            </p>
            <p className={`text-xl font-bold ${((data.price / data.high52w - 1) * 100) >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
              {((data.price / data.high52w - 1) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
