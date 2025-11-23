'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, BarChart3, Loader2 } from 'lucide-react'
import { TechnicalAnalysis } from '@/lib/technical-indicators'

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
        const response = await fetch('/api/indicators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, days: 200 }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch indicators')
        }

        const data = await response.json()
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
            Technical Indicators
          </CardTitle>
          <CardDescription>Real-time technical analysis for {symbol}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin" size={32} />
        </CardContent>
      </Card>
    )
  }

  if (error || !analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} />
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

  const getSignalColor = (signal: string) => {
    if (signal === 'strong_buy' || signal === 'buy' || signal === 'bullish' || signal === 'oversold') {
      return 'text-chart-1'
    } else if (signal === 'strong_sell' || signal === 'sell' || signal === 'bearish' || signal === 'overbought') {
      return 'text-destructive'
    }
    return 'text-muted-foreground'
  }

  const getSignalBgColor = (signal: string) => {
    if (signal === 'strong_buy' || signal === 'buy' || signal === 'bullish' || signal === 'oversold') {
      return 'bg-chart-1/10 border-chart-1'
    } else if (signal === 'strong_sell' || signal === 'sell' || signal === 'bearish' || signal === 'overbought') {
      return 'bg-destructive/10 border-destructive'
    }
    return 'bg-muted border-border'
  }

  const getSignalIcon = (signal: string) => {
    if (signal === 'strong_buy' || signal === 'buy' || signal === 'bullish' || signal === 'oversold') {
      return <TrendingUp size={16} className="text-chart-1" />
    } else if (signal === 'strong_sell' || signal === 'sell' || signal === 'bearish' || signal === 'overbought') {
      return <TrendingDown size={16} className="text-destructive" />
    }
    return <Activity size={16} className="text-muted-foreground" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 size={20} />
          Technical Indicators
        </CardTitle>
        <CardDescription>Real-time technical analysis for {symbol}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Signal */}
        <div className={`p-4 rounded-lg border-2 ${getSignalBgColor(analysis.overallSignal)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Overall Signal</p>
              <p className={`text-2xl font-bold ${getSignalColor(analysis.overallSignal)}`}>
                {analysis.overallSignal.replace('_', ' ').toUpperCase()}
              </p>
            </div>
            <div className="text-4xl">
              {getSignalIcon(analysis.overallSignal)}
            </div>
          </div>
        </div>

        {/* RSI */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">RSI (Relative Strength Index)</p>
              <p className="text-xs text-muted-foreground">{analysis.rsi.description}</p>
            </div>
            {getSignalIcon(analysis.rsi.signal)}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${analysis.rsi.value < 30 ? 'bg-chart-1' : analysis.rsi.value > 70 ? 'bg-destructive' : 'bg-blue-500'}`}
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
            <div className="text-right">
              <p className={`text-2xl font-bold ${getSignalColor(analysis.rsi.signal)}`}>
                {analysis.rsi.value.toFixed(1)}
              </p>
              <p className={`text-xs ${getSignalColor(analysis.rsi.signal)}`}>
                {analysis.rsi.signal.toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* MACD */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">MACD</p>
              <p className="text-xs text-muted-foreground">{analysis.macd.description}</p>
            </div>
            {getSignalIcon(analysis.macd.trend)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">MACD</p>
              <p className="text-sm font-semibold">{analysis.macd.macd.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Signal</p>
              <p className="text-sm font-semibold">{analysis.macd.signal.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Histogram</p>
              <p className={`text-sm font-semibold ${analysis.macd.histogram > 0 ? 'text-chart-1' : 'text-destructive'}`}>
                {analysis.macd.histogram.toFixed(3)}
              </p>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Bollinger Bands</p>
              <p className="text-xs text-muted-foreground">{analysis.bollingerBands.description}</p>
            </div>
            {getSignalIcon(analysis.bollingerBands.position)}
          </div>
          <div className="space-y-1">
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
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Current Price</span>
              <span className={`text-sm font-bold ${getSignalColor(analysis.bollingerBands.position)}`}>
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Bandwidth</span>
              <span className="text-sm font-semibold">{analysis.bollingerBands.bandwidth.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Moving Averages */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Moving Averages</p>
              <p className="text-xs text-muted-foreground">{analysis.movingAverages.description}</p>
            </div>
            {getSignalIcon(analysis.movingAverages.trend)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">SMA 20</span>
              <span className="text-sm font-semibold">${analysis.movingAverages.sma20.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">SMA 50</span>
              <span className="text-sm font-semibold">${analysis.movingAverages.sma50.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">SMA 200</span>
              <span className="text-sm font-semibold">
                {analysis.movingAverages.sma200 > 0 ? `$${analysis.movingAverages.sma200.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">EMA 12</span>
              <span className="text-sm font-semibold">${analysis.movingAverages.ema12.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">EMA 26</span>
              <span className="text-sm font-semibold">${analysis.movingAverages.ema26.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Stochastic Oscillator */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Stochastic Oscillator</p>
              <p className="text-xs text-muted-foreground">{analysis.stochastic.description}</p>
            </div>
            {getSignalIcon(analysis.stochastic.signal)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">%K</p>
              <p className={`text-xl font-bold ${getSignalColor(analysis.stochastic.signal)}`}>
                {analysis.stochastic.k.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">%D</p>
              <p className="text-xl font-bold">{analysis.stochastic.d.toFixed(1)}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${analysis.stochastic.k < 20 ? 'bg-chart-1' : analysis.stochastic.k > 80 ? 'bg-destructive' : 'bg-blue-500'}`}
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

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(analysis.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
