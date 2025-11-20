'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'
import { useHistoricalData } from '@/hooks/use-historical-data'
import { Skeleton } from '@/components/ui/skeleton'

// Advanced indicator calculations
function calculateIndicators(historicalData: Array<{ date: string; close: number; volume: number; high: number; low: number }>) {
  const prices = historicalData.map(d => d.close)
  const volumes = historicalData.map(d => d.volume)
  const highs = historicalData.map(d => d.high)
  const lows = historicalData.map(d => d.low)
  const data = []
  
  for (let i = 0; i < prices.length; i++) {
    let macd = null
    let signal = null
    let histogram = null
    let bollinger_upper = null
    let bollinger_middle = null
    let bollinger_lower = null
    let stochastic = null

    // MACD (Moving Average Convergence Divergence)
    if (i >= 26) {
      const ema12 = calculateEMA(prices.slice(0, i + 1), 12)
      const ema26 = calculateEMA(prices.slice(0, i + 1), 26)
      macd = ema12 - ema26
      
      if (i >= 34) {
        const signalLine = calculateEMA(
          data.slice(0, i - 26).map((d: any) => d.macd).concat([macd]),
          9
        )
        signal = signalLine
        histogram = macd - signal
      }
    }

    // Bollinger Bands
    if (i >= 19) {
      const sma20 = prices.slice(i - 19, i + 1).reduce((a, b) => a + b) / 20
      const variance = prices.slice(i - 19, i + 1).reduce((sum, p) => sum + Math.pow(p - sma20, 2), 0) / 20
      const stdDev = Math.sqrt(variance)
      bollinger_upper = sma20 + (2 * stdDev)
      bollinger_middle = sma20
      bollinger_lower = sma20 - (2 * stdDev)
    }

    // Stochastic Oscillator
    if (i >= 13) {
      const low14 = Math.min(...lows.slice(i - 13, i + 1))
      const high14 = Math.max(...highs.slice(i - 13, i + 1))
      stochastic = ((prices[i] - low14) / (high14 - low14)) * 100
    }

    // RSI Calculation
    let rsi = null
    if (i >= 14) {
      const changes = []
      for (let j = i - 13; j <= i; j++) {
        changes.push(prices[j] - prices[j - 1])
      }
      const gains = changes.map(c => c > 0 ? c : 0)
      const losses = changes.map(c => c < 0 ? -c : 0)
      const avgGain = gains.reduce((a, b) => a + b, 0) / 14
      const avgLoss = losses.reduce((a, b) => a + b, 0) / 14

      if (avgLoss === 0) {
        rsi = 100
      } else {
        const rs = avgGain / avgLoss
        rsi = 100 - (100 / (1 + rs))
      }
    }

    data.push({
      date: historicalData[i].date,
      price: prices[i],
      macd,
      signal,
      histogram,
      bollinger_upper,
      bollinger_middle,
      bollinger_lower,
      stochastic,
      rsi,
      volume: volumes[i],
    })
  }

  return data
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

export function AnalyticsCharts({ symbol }: { symbol: string }) {
  const { data: historicalData, loading, error } = useHistoricalData(symbol, 60)

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !historicalData || !historicalData.data || historicalData.data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            {error || 'No historical data available for this symbol'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const data = calculateIndicators(historicalData.data)

  return (
    <div className="space-y-6">
      {/* Price Chart with Bollinger Bands */}
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Price with Bollinger Bands</CardTitle>
          <CardDescription>Price trend and volatility bands</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={(value: any) => value?.toFixed(2)}
              />
              <Area type="monotone" dataKey="price" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorPrice)" />
              <Line type="monotone" dataKey="bollinger_upper" stroke="var(--color-chart-2)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="bollinger_middle" stroke="var(--color-muted-foreground)" strokeDasharray="3 3" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="bollinger_lower" stroke="var(--color-chart-2)" strokeDasharray="5 5" strokeWidth={1} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MACD Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>MACD - Moving Average Convergence Divergence</CardTitle>
          <CardDescription>Trend-following momentum indicator</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={(value: any) => value?.toFixed(4)}
              />
              <Bar dataKey="histogram" fill="var(--color-chart-3)" opacity={0.3} />
              <Line type="monotone" dataKey="macd" stroke="var(--color-primary)" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="signal" stroke="var(--color-accent)" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stochastic Oscillator */}
      <Card>
        <CardHeader>
          <CardTitle>Stochastic Oscillator</CardTitle>
          <CardDescription>Momentum indicator (0-100 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={(value: any) => value?.toFixed(2)}
              />
              <Legend />
              <Line type="monotone" dataKey="stochastic" stroke="var(--color-secondary)" dot={false} strokeWidth={2} name="Stochastic" />
              <Line type="linear" dataKey={() => 80} stroke="var(--color-destructive)" strokeDasharray="5 5" dot={false} name="Overbought" />
              <Line type="linear" dataKey={() => 20} stroke="var(--color-chart-1)" strokeDasharray="5 5" dot={false} name="Oversold" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* RSI Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>RSI - Relative Strength Index</CardTitle>
          <CardDescription>Momentum indicator (0-100 scale)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={(value: any) => value?.toFixed(2)}
              />
              <Legend />
              <Line type="monotone" dataKey="rsi" stroke="var(--color-primary)" dot={false} strokeWidth={2} name="RSI" />
              <Line type="monotone" dataKey={() => 70} stroke="var(--color-destructive)" strokeDasharray="5 5" dot={false} name="Overbought" />
              <Line type="monotone" dataKey={() => 30} stroke="var(--color-chart-1)" strokeDasharray="5 5" dot={false} name="Oversold" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volume Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Volume Analysis</CardTitle>
          <CardDescription>Volume trends and liquidity</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={(value: any) => `${(value / 1000000).toFixed(2)}M`}
              />
              <Bar dataKey="volume" fill="var(--color-secondary)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
