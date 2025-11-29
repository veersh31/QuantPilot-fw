'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, BarChart3, Loader2, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TechnicalAnalysis } from '@/lib/technical-indicators'
import { apiClient } from '@/lib/api-client'

interface TechnicalIndicatorsProps {
  symbol: string
}

export function TechnicalIndicators({ symbol }: TechnicalIndicatorsProps) {
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)

  useEffect(() => {
    const fetchIndicators = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient.post<{ analysis: TechnicalAnalysis, currentPrice: number }>('/indicators', { symbol, days: 200 })
        setAnalysis(data.analysis)
        setCurrentPrice(data.currentPrice)
      } catch (err) {
        console.error('Error fetching technical indicators:', err)
        setError('Failed to load technical indicators')
      } finally {
        setLoading(false)
      }
    }

    fetchIndicators()
  }, [symbol])

  if (loading) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Technical Indicators
          </CardTitle>
          <CardDescription>Real-time technical analysis for {symbol}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </CardContent>
      </Card>
    )
  }

  if (error || !analysis) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Technical Indicators
          </CardTitle>
          <CardDescription>Real-time technical analysis for {symbol}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    )
  }

  const getSignalBadge = (signal: string) => {
    if (signal === 'strong_buy' || signal === 'buy' || signal === 'bullish' || signal === 'oversold') {
      return (
        <Badge className="bg-emerald-500 text-white border-emerald-600">
          {signal.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    } else if (signal === 'strong_sell' || signal === 'sell' || signal === 'bearish' || signal === 'overbought') {
      return (
        <Badge className="bg-red-500 text-white border-red-600">
          {signal.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    }
    return (
      <Badge variant="outline">
        {signal.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getSignalIcon = (signal: string) => {
    if (signal === 'strong_buy' || signal === 'buy' || signal === 'bullish' || signal === 'oversold') {
      return <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
    } else if (signal === 'strong_sell' || signal === 'sell' || signal === 'bearish' || signal === 'overbought') {
      return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
    }
    return <Minus className="h-5 w-5 text-muted-foreground" />
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Technical Indicators
        </CardTitle>
        <CardDescription>Real-time technical analysis for {symbol}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Signal */}
        <div className="p-6 rounded-lg bg-muted/50 border-2 border-border">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Overall Signal</p>
              {getSignalBadge(analysis.overallSignal)}
            </div>
            <div>
              {getSignalIcon(analysis.overallSignal)}
            </div>
          </div>
        </div>

        {/* RSI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">RSI (Relative Strength Index)</p>
              <p className="text-xs text-muted-foreground">{analysis.rsi.description}</p>
            </div>
            {getSignalBadge(analysis.rsi.signal)}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    analysis.rsi.value < 30
                      ? 'bg-emerald-500'
                      : analysis.rsi.value > 70
                      ? 'bg-red-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(analysis.rsi.value, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>30</span>
                <span>70</span>
                <span>100</span>
              </div>
            </div>
            <div className="text-right min-w-[60px]">
              <p className="text-2xl font-bold">
                {analysis.rsi.value.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* MACD */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">MACD</p>
              <p className="text-xs text-muted-foreground">{analysis.macd.description}</p>
            </div>
            {getSignalBadge(analysis.macd.trend)}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">MACD</p>
              <p className="text-sm font-bold">{analysis.macd.macd.toFixed(3)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Signal</p>
              <p className="text-sm font-bold">{analysis.macd.signal.toFixed(3)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Histogram</p>
              <p className={`text-sm font-bold ${
                analysis.macd.histogram > 0
                  ? 'text-emerald-600 dark:text-emerald-500'
                  : 'text-red-600 dark:text-red-500'
              }`}>
                {analysis.macd.histogram.toFixed(3)}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Bollinger Bands */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Bollinger Bands</p>
              <p className="text-xs text-muted-foreground">{analysis.bollingerBands.description}</p>
            </div>
            {getSignalBadge(analysis.bollingerBands.position)}
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Upper Band</span>
              <span className="text-sm font-semibold">${analysis.bollingerBands.upper.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Middle (SMA20)</span>
              <span className="text-sm font-semibold">${analysis.bollingerBands.middle.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Lower Band</span>
              <span className="text-sm font-semibold">${analysis.bollingerBands.lower.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-medium">Current Price</span>
              <span className="text-sm font-bold">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Bandwidth</span>
              <span className="text-sm font-semibold">{analysis.bollingerBands.bandwidth.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Moving Averages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Moving Averages</p>
              <p className="text-xs text-muted-foreground">{analysis.movingAverages.description}</p>
            </div>
            {getSignalBadge(analysis.movingAverages.trend)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SMA 20</p>
              <p className="text-sm font-bold">${analysis.movingAverages.sma20.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SMA 50</p>
              <p className="text-sm font-bold">${analysis.movingAverages.sma50.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">SMA 200</p>
              <p className="text-sm font-bold">
                {analysis.movingAverages.sma200 > 0 ? `$${analysis.movingAverages.sma200.toFixed(2)}` : 'N/A'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">EMA 12</p>
              <p className="text-sm font-bold">${analysis.movingAverages.ema12.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Stochastic Oscillator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Stochastic Oscillator</p>
              <p className="text-xs text-muted-foreground">{analysis.stochastic.description}</p>
            </div>
            {getSignalBadge(analysis.stochastic.signal)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">%K</p>
              <p className="text-2xl font-bold">
                {analysis.stochastic.k.toFixed(1)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">%D</p>
              <p className="text-2xl font-bold">{analysis.stochastic.d.toFixed(1)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  analysis.stochastic.k < 20
                    ? 'bg-emerald-500'
                    : analysis.stochastic.k > 80
                    ? 'bg-red-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(analysis.stochastic.k, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>20</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-center pt-4">
          Last updated: {new Date(analysis.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
