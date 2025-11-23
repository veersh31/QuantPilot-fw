'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStockData } from '@/hooks/use-stock-data'
import { TrendingUp, TrendingDown, Loader2, Clock, AlertCircle } from 'lucide-react'

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
    <Card>
      <CardHeader>
        {/* Data Delay Warning */}
        <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                DATA MAY BE DELAYED UP TO 15 MINUTES
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yahoo Finance free tier - not real-time market data
              </p>
            </div>
          </div>
        </div>

        <CardTitle className="flex items-center justify-between">
          <span>{data.symbol}</span>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">${data.price.toFixed(2)}</span>
            {data.change >= 0 ? (
              <TrendingUp className="text-chart-1" size={24} />
            ) : (
              <TrendingDown className="text-destructive" size={24} />
            )}
          </div>
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span className={data.change >= 0 ? 'text-chart-1' : 'text-destructive'}>
            {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent}%)
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            Updated {formatTimestamp(data.timestamp)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">52W High</p>
            <p className="font-semibold">${data.high52w.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">52W Low</p>
            <p className="font-semibold">${data.low52w.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Market Cap</p>
            <p className="font-semibold">{data.marketCap}</p>
          </div>
          <div>
            <p className="text-muted-foreground">P/E Ratio</p>
            <p className="font-semibold">{data.pe.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Volume</p>
            <p className="font-semibold">{(data.volume / 1000000).toFixed(2)}M</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dividend Yield</p>
            <p className="font-semibold">{(data.dividendYield * 100).toFixed(2)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
