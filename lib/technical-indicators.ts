export interface PriceData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalAnalysis {
  rsi: {
    value: number
    signal: string
    description: string
  }
  macd: {
    macd: number
    signal: number
    histogram: number
    trend: string
    description: string
  }
  bollingerBands: {
    upper: number
    middle: number
    lower: number
    position: string
    description: string
  }
  movingAverages: {
    sma20: number
    sma50: number
    sma200: number
    trend: string
    description: string
  }
  stochastic: {
    k: number
    d: number
    signal: string
    description: string
  }
  overallSignal: string
}

// Calculate Simple Moving Average
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0
  const slice = data.slice(-period)
  return slice.reduce((sum, val) => sum + val, 0) / period
}

// Calculate Exponential Moving Average
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return 0

  const multiplier = 2 / (period + 1)
  let ema = calculateSMA(data.slice(0, period), period)

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema
  }

  return ema
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50

  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  let gains = 0
  let losses = 0

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i]
    else losses -= changes[i]
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

// Calculate MACD
function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  const macdLine = ema12 - ema26

  // Calculate signal line (9-day EMA of MACD)
  const macdHistory = []
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i)
    const e12 = calculateEMA(slice, 12)
    const e26 = calculateEMA(slice, 26)
    macdHistory.push(e12 - e26)
  }

  const signalLine = calculateEMA(macdHistory, 9)
  const histogram = macdLine - signalLine

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  }
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(prices, period)
  const slice = prices.slice(-period)

  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
  const std = Math.sqrt(variance)

  return {
    upper: sma + (std * stdDev),
    middle: sma,
    lower: sma - (std * stdDev)
  }
}

// Calculate Stochastic Oscillator
function calculateStochastic(data: PriceData[], period: number = 14) {
  if (data.length < period) {
    return { k: 50, d: 50 }
  }

  const slice = data.slice(-period)
  const currentClose = data[data.length - 1].close
  const high = Math.max(...slice.map(d => d.high))
  const low = Math.min(...slice.map(d => d.low))

  const k = ((currentClose - low) / (high - low)) * 100

  // Calculate %D (3-period SMA of %K)
  const kValues = []
  for (let i = period; i <= data.length; i++) {
    const s = data.slice(i - period, i)
    const close = data[i - 1].close
    const h = Math.max(...s.map(d => d.high))
    const l = Math.min(...s.map(d => d.low))
    kValues.push(((close - l) / (h - l)) * 100)
  }

  const d = calculateSMA(kValues, 3)

  return { k, d }
}

export function calculateTechnicalAnalysis(priceData: PriceData[]): TechnicalAnalysis {
  if (!priceData || priceData.length < 200) {
    throw new Error('Insufficient data for technical analysis')
  }

  const closePrices = priceData.map(d => d.close)
  const currentPrice = closePrices[closePrices.length - 1]

  // Calculate RSI
  const rsiValue = calculateRSI(closePrices)
  let rsiSignal = 'Neutral'
  let rsiDescription = 'Market momentum is balanced'

  if (rsiValue > 70) {
    rsiSignal = 'Overbought'
    rsiDescription = 'Stock may be overvalued, consider taking profits'
  } else if (rsiValue < 30) {
    rsiSignal = 'Oversold'
    rsiDescription = 'Stock may be undervalued, potential buying opportunity'
  }

  // Calculate MACD
  const macd = calculateMACD(closePrices)
  let macdTrend = 'Neutral'
  let macdDescription = 'No clear momentum direction'

  if (macd.histogram > 0) {
    macdTrend = 'Bullish'
    macdDescription = 'Positive momentum, upward price movement expected'
  } else if (macd.histogram < 0) {
    macdTrend = 'Bearish'
    macdDescription = 'Negative momentum, downward price movement possible'
  }

  // Calculate Bollinger Bands
  const bb = calculateBollingerBands(closePrices)
  let bbPosition = 'Middle'
  let bbDescription = 'Price is within normal range'

  if (currentPrice > bb.upper) {
    bbPosition = 'Above Upper Band'
    bbDescription = 'Price is above upper band, may indicate overbought conditions'
  } else if (currentPrice < bb.lower) {
    bbPosition = 'Below Lower Band'
    bbDescription = 'Price is below lower band, may indicate oversold conditions'
  } else if (currentPrice > bb.middle) {
    bbPosition = 'Upper Half'
    bbDescription = 'Price is in upper half, showing relative strength'
  } else {
    bbPosition = 'Lower Half'
    bbDescription = 'Price is in lower half, showing relative weakness'
  }

  // Calculate Moving Averages
  const sma20 = calculateSMA(closePrices, 20)
  const sma50 = calculateSMA(closePrices, 50)
  const sma200 = calculateSMA(closePrices, 200)

  let maTrend = 'Neutral'
  let maDescription = 'Moving averages show no clear trend'

  if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
    maTrend = 'Strong Uptrend'
    maDescription = 'All moving averages aligned bullishly, strong uptrend'
  } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
    maTrend = 'Strong Downtrend'
    maDescription = 'All moving averages aligned bearishly, strong downtrend'
  } else if (currentPrice > sma50) {
    maTrend = 'Uptrend'
    maDescription = 'Price above key moving averages, moderate uptrend'
  } else if (currentPrice < sma50) {
    maTrend = 'Downtrend'
    maDescription = 'Price below key moving averages, moderate downtrend'
  }

  // Calculate Stochastic
  const stoch = calculateStochastic(priceData)
  let stochSignal = 'Neutral'
  let stochDescription = 'Momentum is balanced'

  if (stoch.k > 80) {
    stochSignal = 'Overbought'
    stochDescription = 'Momentum indicator suggests overbought conditions'
  } else if (stoch.k < 20) {
    stochSignal = 'Oversold'
    stochDescription = 'Momentum indicator suggests oversold conditions'
  }

  // Calculate Overall Signal
  const signals = {
    bullish: 0,
    bearish: 0,
    neutral: 0
  }

  // RSI contribution
  if (rsiValue < 30) signals.bullish++
  else if (rsiValue > 70) signals.bearish++
  else signals.neutral++

  // MACD contribution
  if (macd.histogram > 0) signals.bullish++
  else if (macd.histogram < 0) signals.bearish++
  else signals.neutral++

  // Bollinger Bands contribution
  if (currentPrice < bb.lower) signals.bullish++
  else if (currentPrice > bb.upper) signals.bearish++
  else signals.neutral++

  // Moving Averages contribution
  if (maTrend.includes('Uptrend')) signals.bullish++
  else if (maTrend.includes('Downtrend')) signals.bearish++
  else signals.neutral++

  // Stochastic contribution
  if (stoch.k < 20) signals.bullish++
  else if (stoch.k > 80) signals.bearish++
  else signals.neutral++

  let overallSignal = 'neutral'
  if (signals.bullish > signals.bearish && signals.bullish >= 3) {
    overallSignal = 'strong_buy'
  } else if (signals.bullish > signals.bearish) {
    overallSignal = 'buy'
  } else if (signals.bearish > signals.bullish && signals.bearish >= 3) {
    overallSignal = 'strong_sell'
  } else if (signals.bearish > signals.bullish) {
    overallSignal = 'sell'
  }

  return {
    rsi: {
      value: rsiValue,
      signal: rsiSignal,
      description: rsiDescription
    },
    macd: {
      macd: macd.macd,
      signal: macd.signal,
      histogram: macd.histogram,
      trend: macdTrend,
      description: macdDescription
    },
    bollingerBands: {
      upper: bb.upper,
      middle: bb.middle,
      lower: bb.lower,
      position: bbPosition,
      description: bbDescription
    },
    movingAverages: {
      sma20,
      sma50,
      sma200,
      trend: maTrend,
      description: maDescription
    },
    stochastic: {
      k: stoch.k,
      d: stoch.d,
      signal: stochSignal,
      description: stochDescription
    },
    overallSignal
  }
}
