/**
 * Professional ML Feature Engineering
 * Extracts meaningful features from historical stock/ETF data for prediction models
 */

import { PriceData, calculateTechnicalAnalysis } from '../technical-indicators'

export interface MLFeatures {
  // Price features
  closePrice: number
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number

  // Returns
  returns: number
  logReturns: number
  returns5d: number
  returns10d: number
  returns20d: number

  // Technical indicators
  rsi: number
  macd: number
  macdSignal: number
  macdHist: number
  bollingerUpper: number
  bollingerMiddle: number
  bollingerLower: number
  bollingerPosition: number // Where price is relative to bands

  // Moving averages
  sma5: number
  sma10: number
  sma20: number
  sma50: number
  sma200: number
  ema12: number
  ema26: number

  // Momentum indicators
  roc: number // Rate of change
  momentum: number
  stochK: number
  stochD: number

  // Volatility
  atr: number // Average True Range
  volatility20d: number
  volatility50d: number

  // Volume indicators
  volumeRatio: number // Current volume / avg volume
  obv: number // On-Balance Volume
  vwap: number // Volume Weighted Average Price

  // Pattern features
  priceRange: number
  bodySize: number
  upperShadow: number
  lowerShadow: number
  gapSize: number

  // Trend features
  trend5d: number
  trend10d: number
  trend20d: number
  macdTrend: number
}

export interface EngineereedDataset {
  features: MLFeatures[]
  targets: number[] // Next day's close price
  dates: string[]
  rawPrices: PriceData[]
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]
  const slice = prices.slice(-period)
  return slice.reduce((sum, p) => sum + p, 0) / period
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]

  const multiplier = 2 / (period + 1)
  let ema = calculateSMA(prices.slice(0, period), period)

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Calculate Rate of Change
 */
function calculateROC(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0
  const current = prices[prices.length - 1]
  const past = prices[prices.length - 1 - period]
  return ((current - past) / past) * 100
}

/**
 * Calculate Average True Range (ATR)
 */
function calculateATR(data: PriceData[], period: number): number {
  if (data.length < period) return 0

  const trueRanges: number[] = []
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high
    const low = data[i].low
    const prevClose = data[i - 1].close

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }

  const slice = trueRanges.slice(-period)
  return slice.reduce((sum, tr) => sum + tr, 0) / slice.length
}

/**
 * Calculate On-Balance Volume (OBV)
 */
function calculateOBV(data: PriceData[]): number {
  let obv = 0
  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      obv += data[i].volume
    } else if (data[i].close < data[i - 1].close) {
      obv -= data[i].volume
    }
  }
  return obv
}

/**
 * Calculate Volume Weighted Average Price (VWAP)
 */
function calculateVWAP(data: PriceData[], period: number): number {
  if (data.length < period) return data[data.length - 1].close

  const slice = data.slice(-period)
  let sumPriceVolume = 0
  let sumVolume = 0

  for (const bar of slice) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3
    sumPriceVolume += typicalPrice * bar.volume
    sumVolume += bar.volume
  }

  return sumVolume > 0 ? sumPriceVolume / sumVolume : slice[slice.length - 1].close
}

/**
 * Calculate volatility (standard deviation of returns)
 */
function calculateVolatility(prices: number[], period: number): number {
  if (prices.length < period + 1) return 0

  const returns: number[] = []
  for (let i = prices.length - period; i < prices.length; i++) {
    if (i > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2))
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length

  return Math.sqrt(variance) * Math.sqrt(252) // Annualized
}

/**
 * Extract features for a single data point
 */
export function extractFeatures(
  data: PriceData[],
  index: number
): MLFeatures | null {
  if (index < 200) return null // Need enough historical data

  const historicalData = data.slice(0, index + 1)
  const current = data[index]
  const closes = historicalData.map(d => d.close)
  const volumes = historicalData.map(d => d.volume)
  const highs = historicalData.map(d => d.high)
  const lows = historicalData.map(d => d.low)

  // Calculate technical analysis
  const technical = calculateTechnicalAnalysis(historicalData)

  // Price features
  const closePrice = current.close
  const openPrice = current.open
  const highPrice = current.high
  const lowPrice = current.low
  const volume = current.volume

  // Returns
  const returns = index > 0 ? (closes[index] - closes[index - 1]) / closes[index - 1] : 0
  const logReturns = index > 0 ? Math.log(closes[index] / closes[index - 1]) : 0
  const returns5d = index >= 5 ? (closes[index] - closes[index - 5]) / closes[index - 5] : 0
  const returns10d = index >= 10 ? (closes[index] - closes[index - 10]) / closes[index - 10] : 0
  const returns20d = index >= 20 ? (closes[index] - closes[index - 20]) / closes[index - 20] : 0

  // Moving averages
  const sma5 = calculateSMA(closes, 5)
  const sma10 = calculateSMA(closes, 10)
  const sma20 = calculateSMA(closes, 20)
  const sma50 = calculateSMA(closes, 50)
  const sma200 = calculateSMA(closes, 200)
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  // Momentum
  const roc = calculateROC(closes, 10)
  const momentum = index >= 10 ? closes[index] - closes[index - 10] : 0

  // Volatility
  const atr = calculateATR(historicalData, 14)
  const volatility20d = calculateVolatility(closes, 20)
  const volatility50d = calculateVolatility(closes, 50)

  // Volume
  const avgVolume = calculateSMA(volumes, 20)
  const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1
  const obv = calculateOBV(historicalData)
  const vwap = calculateVWAP(historicalData, 20)

  // Pattern features
  const priceRange = highPrice - lowPrice
  const bodySize = Math.abs(closePrice - openPrice)
  const upperShadow = highPrice - Math.max(openPrice, closePrice)
  const lowerShadow = Math.min(openPrice, closePrice) - lowPrice
  const gapSize = index > 0 ? openPrice - data[index - 1].close : 0

  // Trend features (slope of linear regression)
  const trend5d = calculateTrend(closes.slice(-5))
  const trend10d = calculateTrend(closes.slice(-10))
  const trend20d = calculateTrend(closes.slice(-20))
  const macdTrend = technical.macd.histogram > 0 ? 1 : -1

  // Bollinger Band position
  const bollingerRange = technical.bollingerBands.upper - technical.bollingerBands.lower
  const bollingerPosition = bollingerRange > 0
    ? (closePrice - technical.bollingerBands.lower) / bollingerRange
    : 0.5

  return {
    closePrice,
    openPrice,
    highPrice,
    lowPrice,
    volume,
    returns,
    logReturns,
    returns5d,
    returns10d,
    returns20d,
    rsi: technical.rsi.value,
    macd: technical.macd.macd,
    macdSignal: technical.macd.signal,
    macdHist: technical.macd.histogram,
    bollingerUpper: technical.bollingerBands.upper,
    bollingerMiddle: technical.bollingerBands.middle,
    bollingerLower: technical.bollingerBands.lower,
    bollingerPosition,
    sma5,
    sma10,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    roc,
    momentum,
    stochK: technical.stochastic.k,
    stochD: technical.stochastic.d,
    atr,
    volatility20d,
    volatility50d,
    volumeRatio,
    obv,
    vwap,
    priceRange,
    bodySize,
    upperShadow,
    lowerShadow,
    gapSize,
    trend5d,
    trend10d,
    trend20d,
    macdTrend,
  }
}

/**
 * Calculate trend (slope) using linear regression
 */
function calculateTrend(prices: number[]): number {
  if (prices.length < 2) return 0

  const n = prices.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += prices[i]
    sumXY += i * prices[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return slope
}

/**
 * Engineer complete dataset for ML training
 */
export function engineerDataset(
  historicalData: PriceData[],
  lookForward: number = 1
): EngineereedDataset {
  const features: MLFeatures[] = []
  const targets: number[] = []
  const dates: string[] = []

  for (let i = 200; i < historicalData.length - lookForward; i++) {
    const feature = extractFeatures(historicalData, i)
    if (feature) {
      features.push(feature)
      targets.push(historicalData[i + lookForward].close) // Next day's close
      dates.push(historicalData[i].date)
    }
  }

  return {
    features,
    targets,
    dates,
    rawPrices: historicalData,
  }
}

/**
 * Normalize features for neural networks
 */
export function normalizeFeatures(features: MLFeatures[]): {
  normalized: number[][]
  means: number[]
  stds: number[]
  featureNames: string[]
} {
  const featureNames = Object.keys(features[0]) as (keyof MLFeatures)[]
  const numFeatures = featureNames.length

  // Calculate means and standard deviations
  const means: number[] = new Array(numFeatures).fill(0)
  const stds: number[] = new Array(numFeatures).fill(0)

  // Calculate means
  for (const feature of features) {
    featureNames.forEach((name, idx) => {
      means[idx] += feature[name]
    })
  }
  means.forEach((_, idx) => {
    means[idx] /= features.length
  })

  // Calculate standard deviations
  for (const feature of features) {
    featureNames.forEach((name, idx) => {
      stds[idx] += Math.pow(feature[name] - means[idx], 2)
    })
  }
  stds.forEach((_, idx) => {
    stds[idx] = Math.sqrt(stds[idx] / features.length)
    if (stds[idx] === 0) stds[idx] = 1 // Prevent division by zero
  })

  // Normalize
  const normalized: number[][] = features.map(feature => {
    return featureNames.map((name, idx) => {
      return (feature[name] - means[idx]) / stds[idx]
    })
  })

  return { normalized, means, stds, featureNames }
}

/**
 * Denormalize predictions
 */
export function denormalizePredictions(
  normalized: number[],
  mean: number,
  std: number
): number[] {
  return normalized.map(val => val * std + mean)
}
