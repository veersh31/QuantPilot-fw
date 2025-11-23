/**
 * Technical Indicators Library
 * Industry-standard implementations of common technical analysis indicators
 */

export interface PriceData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface RSIResult {
  value: number
  signal: 'oversold' | 'neutral' | 'overbought'
  description: string
}

export interface MACDResult {
  macd: number
  signal: number
  histogram: number
  trend: 'bullish' | 'bearish' | 'neutral'
  description: string
}

export interface BollingerBandsResult {
  upper: number
  middle: number
  lower: number
  bandwidth: number
  position: 'below' | 'middle' | 'above'
  description: string
}

export interface MovingAverageResult {
  sma20: number
  sma50: number
  sma200: number
  ema12: number
  ema26: number
  trend: 'bullish' | 'bearish' | 'neutral'
  description: string
}

export interface StochasticResult {
  k: number
  d: number
  signal: 'oversold' | 'neutral' | 'overbought'
  description: string
}

export interface TechnicalAnalysis {
  rsi: RSIResult
  macd: MACDResult
  bollingerBands: BollingerBandsResult
  movingAverages: MovingAverageResult
  stochastic: StochasticResult
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  timestamp: string
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0
  const slice = data.slice(-period)
  return slice.reduce((sum, val) => sum + val, 0) / period
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0
  if (data.length < period) {
    // If not enough data, return SMA
    return calculateSMA(data, data.length)
  }

  const multiplier = 2 / (period + 1)
  let ema = calculateSMA(data.slice(0, period), period)

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Calculate Relative Strength Index (RSI)
 * Industry-standard 14-period RSI using Wilder's smoothing method
 */
export function calculateRSI(prices: number[], period: number = 14): RSIResult {
  if (prices.length < period + 1) {
    return {
      value: 50,
      signal: 'neutral',
      description: 'Insufficient data for RSI calculation'
    }
  }

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  // Separate gains and losses
  const gains = changes.map(change => change > 0 ? change : 0)
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0)

  // Calculate initial average gain and loss using SMA
  let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period
  let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period

  // Apply Wilder's smoothing for remaining periods
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }

  // Calculate RS and RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))

  // Determine signal
  let signal: 'oversold' | 'neutral' | 'overbought'
  let description: string

  if (rsi < 30) {
    signal = 'oversold'
    description = `RSI at ${rsi.toFixed(2)} indicates oversold conditions - potential buying opportunity`
  } else if (rsi > 70) {
    signal = 'overbought'
    description = `RSI at ${rsi.toFixed(2)} indicates overbought conditions - potential selling pressure`
  } else {
    signal = 'neutral'
    description = `RSI at ${rsi.toFixed(2)} is in neutral territory`
  }

  return { value: rsi, signal, description }
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Standard parameters: 12-period EMA, 26-period EMA, 9-period signal line
 */
export function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDResult {
  if (prices.length < slowPeriod + signalPeriod) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
      trend: 'neutral',
      description: 'Insufficient data for MACD calculation'
    }
  }

  // Calculate EMAs
  const emaFast = calculateEMA(prices, fastPeriod)
  const emaSlow = calculateEMA(prices, slowPeriod)

  // MACD line
  const macdLine = emaFast - emaSlow

  // Calculate MACD values for signal line
  const macdValues: number[] = []
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    const priceSlice = prices.slice(0, i + 1)
    const fast = calculateEMA(priceSlice, fastPeriod)
    const slow = calculateEMA(priceSlice, slowPeriod)
    macdValues.push(fast - slow)
  }

  // Signal line (EMA of MACD)
  const signalLine = calculateEMA(macdValues, signalPeriod)

  // Histogram
  const histogram = macdLine - signalLine

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral'
  let description: string

  if (histogram > 0 && macdLine > signalLine) {
    trend = 'bullish'
    description = `MACD (${macdLine.toFixed(2)}) is above signal line - bullish momentum`
  } else if (histogram < 0 && macdLine < signalLine) {
    trend = 'bearish'
    description = `MACD (${macdLine.toFixed(2)}) is below signal line - bearish momentum`
  } else {
    trend = 'neutral'
    description = `MACD shows neutral momentum`
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    trend,
    description
  }
}

/**
 * Calculate Bollinger Bands
 * Standard: 20-period SMA with 2 standard deviations
 */
export function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBandsResult {
  if (prices.length < period) {
    const current = prices[prices.length - 1] || 0
    return {
      upper: current,
      middle: current,
      lower: current,
      bandwidth: 0,
      position: 'middle',
      description: 'Insufficient data for Bollinger Bands'
    }
  }

  // Calculate middle band (SMA)
  const middle = calculateSMA(prices, period)

  // Calculate standard deviation
  const slice = prices.slice(-period)
  const squaredDiffs = slice.map(price => Math.pow(price - middle, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period
  const standardDeviation = Math.sqrt(variance)

  // Calculate bands
  const upper = middle + (stdDev * standardDeviation)
  const lower = middle - (stdDev * standardDeviation)

  const currentPrice = prices[prices.length - 1]
  const bandwidth = ((upper - lower) / middle) * 100

  // Determine position
  let position: 'below' | 'middle' | 'above'
  let description: string

  if (currentPrice > upper) {
    position = 'above'
    description = `Price (${currentPrice.toFixed(2)}) is above upper band (${upper.toFixed(2)}) - potentially overbought`
  } else if (currentPrice < lower) {
    position = 'below'
    description = `Price (${currentPrice.toFixed(2)}) is below lower band (${lower.toFixed(2)}) - potentially oversold`
  } else {
    position = 'middle'
    description = `Price (${currentPrice.toFixed(2)}) is within bands - normal volatility`
  }

  return {
    upper,
    middle,
    lower,
    bandwidth,
    position,
    description
  }
}

/**
 * Calculate Moving Averages and trends
 */
export function calculateMovingAverages(prices: number[]): MovingAverageResult {
  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, 50)
  const sma200 = calculateSMA(prices, 200)
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)

  const currentPrice = prices[prices.length - 1] || 0

  // Determine trend based on moving average alignment
  let trend: 'bullish' | 'bearish' | 'neutral'
  let description: string

  if (sma20 > sma50 && (sma200 === 0 || sma50 > sma200) && currentPrice > sma20) {
    trend = 'bullish'
    description = 'Price above short-term MAs in bullish alignment'
  } else if (sma20 < sma50 && (sma200 === 0 || sma50 < sma200) && currentPrice < sma20) {
    trend = 'bearish'
    description = 'Price below short-term MAs in bearish alignment'
  } else {
    trend = 'neutral'
    description = 'Moving averages show mixed signals'
  }

  return {
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    trend,
    description
  }
}

/**
 * Calculate Stochastic Oscillator
 * Standard: 14-period %K, 3-period %D
 */
export function calculateStochastic(data: PriceData[], kPeriod: number = 14, dPeriod: number = 3): StochasticResult {
  if (data.length < kPeriod) {
    return {
      k: 50,
      d: 50,
      signal: 'neutral',
      description: 'Insufficient data for Stochastic calculation'
    }
  }

  const recentData = data.slice(-kPeriod)
  const currentClose = recentData[recentData.length - 1].close
  const highestHigh = Math.max(...recentData.map(d => d.high))
  const lowestLow = Math.min(...recentData.map(d => d.low))

  // Calculate %K
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100

  // Calculate %D (SMA of %K)
  const kValues: number[] = []
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1)
    const close = slice[slice.length - 1].close
    const high = Math.max(...slice.map(d => d.high))
    const low = Math.min(...slice.map(d => d.low))
    kValues.push(((close - low) / (high - low)) * 100)
  }

  const d = calculateSMA(kValues, Math.min(dPeriod, kValues.length))

  // Determine signal
  let signal: 'oversold' | 'neutral' | 'overbought'
  let description: string

  if (k < 20) {
    signal = 'oversold'
    description = `Stochastic %K at ${k.toFixed(2)} indicates oversold conditions`
  } else if (k > 80) {
    signal = 'overbought'
    description = `Stochastic %K at ${k.toFixed(2)} indicates overbought conditions`
  } else {
    signal = 'neutral'
    description = `Stochastic in neutral range at ${k.toFixed(2)}`
  }

  return { k, d, signal, description }
}

/**
 * Calculate comprehensive technical analysis
 */
export function calculateTechnicalAnalysis(data: PriceData[]): TechnicalAnalysis {
  const closePrices = data.map(d => d.close)

  const rsi = calculateRSI(closePrices)
  const macd = calculateMACD(closePrices)
  const bollingerBands = calculateBollingerBands(closePrices)
  const movingAverages = calculateMovingAverages(closePrices)
  const stochastic = calculateStochastic(data)

  // Calculate overall signal based on multiple indicators
  let bullishSignals = 0
  let bearishSignals = 0

  // RSI signals
  if (rsi.signal === 'oversold') bullishSignals++
  if (rsi.signal === 'overbought') bearishSignals++

  // MACD signals
  if (macd.trend === 'bullish') bullishSignals++
  if (macd.trend === 'bearish') bearishSignals++

  // Bollinger Bands signals
  if (bollingerBands.position === 'below') bullishSignals++
  if (bollingerBands.position === 'above') bearishSignals++

  // Moving Average signals
  if (movingAverages.trend === 'bullish') bullishSignals++
  if (movingAverages.trend === 'bearish') bearishSignals++

  // Stochastic signals
  if (stochastic.signal === 'oversold') bullishSignals++
  if (stochastic.signal === 'overbought') bearishSignals++

  // Determine overall signal
  let overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'

  if (bullishSignals >= 4) {
    overallSignal = 'strong_buy'
  } else if (bullishSignals >= 3) {
    overallSignal = 'buy'
  } else if (bearishSignals >= 4) {
    overallSignal = 'strong_sell'
  } else if (bearishSignals >= 3) {
    overallSignal = 'sell'
  } else {
    overallSignal = 'neutral'
  }

  return {
    rsi,
    macd,
    bollingerBands,
    movingAverages,
    stochastic,
    overallSignal,
    timestamp: new Date().toISOString()
  }
}
