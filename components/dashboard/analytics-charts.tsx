'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceArea } from 'recharts'
import { BarChart3, CandlestickChart as CandlestickIcon } from 'lucide-react'
import { useHistoricalData, TimeframeOption } from '@/hooks/use-historical-data'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

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
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1M')
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area')
  const { data: historicalData, loading, error } = useHistoricalData(symbol, timeframe)

  const timeframeOptions: TimeframeOption[] = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX']

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

  // Prepare candlestick data from raw historical data
  const candlestickData = historicalData.data.map((d: any) => ({
    date: d.date,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
    // Calculate candle body values for rendering
    bodyTop: Math.max(d.open, d.close),
    bodyBottom: Math.min(d.open, d.close),
    bodyHeight: Math.abs(d.close - d.open),
    isGreen: d.close >= d.open,
  }))

  // Filter data for indicators that require more data points
  const macdData = data.filter(d => d.macd !== null)
  const rsiData = data.filter(d => d.rsi !== null)
  const stochasticData = data.filter(d => d.stochastic !== null)
  const bollingerData = data.filter(d => d.bollinger_middle !== null)

  // Check if we have enough data for each indicator
  const hasEnoughDataForMACD = macdData.length >= 10
  const hasEnoughDataForRSI = rsiData.length >= 10
  const hasEnoughDataForStochastic = stochasticData.length >= 10
  const hasEnoughDataForBollinger = bollingerData.length >= 10

  // Custom candlestick shape renderer
  const CandlestickShape = (props: any) => {
    const { x, y, width, height, payload } = props
    const isGreen = payload.isGreen
    const wickX = x + width / 2

    // Calculate wick positions based on domain
    const yScale = height / (Math.max(...candlestickData.map(d => d.high)) - Math.min(...candlestickData.map(d => d.low)))
    const minPrice = Math.min(...candlestickData.map(d => d.low))

    const highY = y - ((payload.high - payload.bodyTop) * yScale)
    const lowY = y + height + ((payload.bodyBottom - payload.low) * yScale)

    return (
      <g>
        {/* Upper wick (high to body top) */}
        <line
          x1={wickX}
          y1={highY}
          x2={wickX}
          y2={y}
          stroke={isGreen ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          strokeWidth={1}
        />
        {/* Candle body */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height || 1}
          fill={isGreen ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          stroke={isGreen ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          strokeWidth={1}
          opacity={isGreen ? 0.8 : 1}
        />
        {/* Lower wick (body bottom to low) */}
        <line
          x1={wickX}
          y1={y + height}
          x2={wickX}
          y2={lowY}
          stroke={isGreen ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          strokeWidth={1}
        />
      </g>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern Timeframe Selector */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-background via-background to-muted/5">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">{symbol} Charts & Analytics</CardTitle>
              <CardDescription className="text-base mt-1">
                Multi-timeframe technical analysis with professional indicators
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Chart Type Toggle */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
                <Button
                  variant={chartType === 'area' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('area')}
                  className={`gap-1.5 ${chartType === 'area' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm' : ''}`}
                >
                  <BarChart3 size={14} />
                  Area
                </Button>
                <Button
                  variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('candlestick')}
                  className={`gap-1.5 ${chartType === 'candlestick' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm' : ''}`}
                >
                  <CandlestickIcon size={14} />
                  Candles
                </Button>
              </div>

              {/* Timeframe Buttons */}
              <div className="flex flex-wrap gap-2">
                {timeframeOptions.map((tf) => (
                  <Button
                    key={tf}
                    variant={timeframe === tf ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeframe(tf)}
                    className={`min-w-[55px] font-bold transition-all duration-200 ${
                      timeframe === tf
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-md hover:shadow-lg hover:scale-105'
                        : 'hover:bg-muted hover:scale-105'
                    }`}
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Data Warning */}
      {(!hasEnoughDataForMACD || !hasEnoughDataForRSI || !hasEnoughDataForBollinger) && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Note:</strong> Some technical indicators require more data points. For best results, select 1M or longer timeframes.
              {!hasEnoughDataForMACD && ' MACD requires 26+ days.'}
              {!hasEnoughDataForRSI && ' RSI requires 14+ days.'}
              {!hasEnoughDataForBollinger && ' Bollinger Bands require 20+ days.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Price Chart with Bollinger Bands */}
      <Card className="border-blue-500/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                {symbol} - {chartType === 'candlestick' ? 'Candlestick' : 'Price'} Chart ({timeframe})
              </CardTitle>
              <CardDescription className="mt-1">
                {chartType === 'candlestick' ? 'OHLC price action • Green = Up, Red = Down' : 'Price trend and volatility bands • Hover to inspect'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    // Show abbreviated date for better readability
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(value: any, name: string) => [
                    `$${value?.toFixed(2)}`,
                    name === 'price' ? 'Price' :
                    name === 'bollinger_upper' ? 'Upper Band' :
                    name === 'bollinger_middle' ? 'Middle Band' :
                    name === 'bollinger_lower' ? 'Lower Band' : name
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  animationDuration={1000}
                />
                <Line
                  type="monotone"
                  dataKey="bollinger_upper"
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={1000}
                />
                <Line
                  type="monotone"
                  dataKey="bollinger_middle"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={1000}
                />
                <Line
                  type="monotone"
                  dataKey="bollinger_lower"
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                  animationDuration={1000}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={candlestickData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--color-muted-foreground)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '4px' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div style={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}>
                          <p style={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}>
                            {data.date}
                          </p>
                          <div style={{ display: 'grid', gap: '4px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Open:</span>
                              <span style={{ fontWeight: 'bold' }}>${data.open?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>High:</span>
                              <span style={{ fontWeight: 'bold', color: 'rgb(34, 197, 94)' }}>${data.high?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Low:</span>
                              <span style={{ fontWeight: 'bold', color: 'rgb(239, 68, 68)' }}>${data.low?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Close:</span>
                              <span style={{ fontWeight: 'bold' }}>${data.close?.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid hsl(var(--border))' }}>
                              <span style={{ color: 'hsl(var(--muted-foreground))' }}>Change:</span>
                              <span style={{
                                fontWeight: 'bold',
                                color: data.isGreen ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                              }}>
                                {data.isGreen ? '+' : ''}{(data.close - data.open).toFixed(2)} ({((data.close - data.open) / data.open * 100).toFixed(2)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="bodyHeight"
                  fill="rgb(34, 197, 94)"
                  shape={CandlestickShape}
                  animationDuration={800}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* MACD Indicator */}
      <Card className="border-purple-500/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            MACD - Moving Average Convergence Divergence
          </CardTitle>
          <CardDescription>Trend-following momentum indicator (requires 26+ data points)</CardDescription>
        </CardHeader>
        <CardContent>
          {hasEnoughDataForMACD ? (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={macdData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                  labelStyle={{ color: 'var(--color-foreground)' }}
                  formatter={(value: any) => value?.toFixed(4)}
                />
                <Legend />
                <Bar dataKey="histogram" fill="var(--color-chart-3)" opacity={0.3} name="Histogram" />
                <Line type="monotone" dataKey="macd" stroke="var(--color-primary)" dot={false} strokeWidth={2} name="MACD" />
                <Line type="monotone" dataKey="signal" stroke="var(--color-accent)" dot={false} strokeWidth={2} name="Signal" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Insufficient data for MACD calculation</p>
                <p className="text-xs mt-1">Select a longer timeframe (1M or more)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stochastic Oscillator */}
      <Card>
        <CardHeader>
          <CardTitle>Stochastic Oscillator</CardTitle>
          <CardDescription>Momentum indicator (0-100 scale, requires 14+ data points)</CardDescription>
        </CardHeader>
        <CardContent>
          {hasEnoughDataForStochastic ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stochasticData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Insufficient data for Stochastic calculation</p>
                <p className="text-xs mt-1">Select a longer timeframe (1M or more)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* RSI Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>RSI - Relative Strength Index</CardTitle>
          <CardDescription>Momentum indicator (0-100 scale, requires 14+ data points)</CardDescription>
        </CardHeader>
        <CardContent>
          {hasEnoughDataForRSI ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rsiData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">Insufficient data for RSI calculation</p>
                <p className="text-xs mt-1">Select a longer timeframe (1M or more)</p>
              </div>
            </div>
          )}
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
