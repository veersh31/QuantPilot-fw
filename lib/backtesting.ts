/**
 * Backtesting Engine
 * Test trading strategies against historical data
 */

import { PriceData, TechnicalAnalysis, calculateTechnicalAnalysis } from './technical-indicators'

export interface BacktestStrategy {
  name: string
  buySignal: (analysis: TechnicalAnalysis, price: PriceData) => boolean
  sellSignal: (analysis: TechnicalAnalysis, price: PriceData) => boolean
  stopLoss?: number // Percentage (e.g., 5 for 5%)
  takeProfit?: number // Percentage
}

export interface Trade {
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  quantity: number
  profit: number
  profitPercent: number
  holdingPeriod: number // days
  type: 'win' | 'loss'
}

export interface BacktestResults {
  strategy: string
  symbol: string
  startDate: string
  endDate: string
  initialCapital: number
  finalCapital: number
  totalReturn: number
  totalReturnPercent: number
  trades: Trade[]
  winningTrades: number
  losingTrades: number
  winRate: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  maxDrawdown: number
  sharpeRatio: number
  numberOfTrades: number
  averageHoldingPeriod: number
  profitFactor: number
}

/**
 * Run backtest on historical data
 */
export async function runBacktest(
  symbol: string,
  historicalData: PriceData[],
  strategy: BacktestStrategy,
  initialCapital: number = 10000,
  positionSize: number = 1 // Fraction of capital per trade (0-1)
): Promise<BacktestResults> {
  const trades: Trade[] = []
  let cash = initialCapital
  let position: { quantity: number; entryPrice: number; entryDate: string } | null = null
  let highWaterMark = initialCapital
  let maxDrawdown = 0

  // Need enough data for technical indicators
  if (historicalData.length < 200) {
    throw new Error('Insufficient historical data for backtesting (minimum 200 days)')
  }

  // Simulate trading day by day
  for (let i = 200; i < historicalData.length; i++) {
    const currentData = historicalData.slice(0, i + 1)
    const analysis = calculateTechnicalAnalysis(currentData)
    const currentPrice = currentData[i]

    // Check for sell signal first (if we have a position)
    if (position) {
      let shouldSell = false
      let sellReason = ''

      // Check strategy sell signal
      if (strategy.sellSignal(analysis, currentPrice)) {
        shouldSell = true
        sellReason = 'strategy'
      }

      // Check stop loss
      if (strategy.stopLoss) {
        const lossPercent = ((currentPrice.close - position.entryPrice) / position.entryPrice) * 100
        if (lossPercent <= -strategy.stopLoss) {
          shouldSell = true
          sellReason = 'stop-loss'
        }
      }

      // Check take profit
      if (strategy.takeProfit) {
        const gainPercent = ((currentPrice.close - position.entryPrice) / position.entryPrice) * 100
        if (gainPercent >= strategy.takeProfit) {
          shouldSell = true
          sellReason = 'take-profit'
        }
      }

      if (shouldSell) {
        // Close position
        const exitPrice = currentPrice.close
        const profit = (exitPrice - position.entryPrice) * position.quantity
        const profitPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
        const holdingPeriod = Math.floor(
          (new Date(currentPrice.date).getTime() - new Date(position.entryDate).getTime()) /
          (1000 * 60 * 60 * 24)
        )

        cash += (exitPrice * position.quantity)

        trades.push({
          entryDate: position.entryDate,
          entryPrice: position.entryPrice,
          exitDate: currentPrice.date,
          exitPrice,
          quantity: position.quantity,
          profit,
          profitPercent,
          holdingPeriod,
          type: profit >= 0 ? 'win' : 'loss'
        })

        position = null

        // Update drawdown
        const currentValue = cash
        if (currentValue > highWaterMark) {
          highWaterMark = currentValue
        }
        const drawdown = ((highWaterMark - currentValue) / highWaterMark) * 100
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      }
    }

    // Check for buy signal (if we don't have a position)
    if (!position && strategy.buySignal(analysis, currentPrice)) {
      // Calculate position size
      const buyingPower = cash * positionSize
      const quantity = Math.floor(buyingPower / currentPrice.close)

      if (quantity > 0) {
        const cost = quantity * currentPrice.close
        cash -= cost

        position = {
          quantity,
          entryPrice: currentPrice.close,
          entryDate: currentPrice.date
        }
      }
    }
  }

  // Close any remaining position at the end
  if (position) {
    const lastPrice = historicalData[historicalData.length - 1]
    const exitPrice = lastPrice.close
    const profit = (exitPrice - position.entryPrice) * position.quantity
    const profitPercent = ((exitPrice - position.entryPrice) / position.entryPrice) * 100
    const holdingPeriod = Math.floor(
      (new Date(lastPrice.date).getTime() - new Date(position.entryDate).getTime()) /
      (1000 * 60 * 60 * 24)
    )

    cash += (exitPrice * position.quantity)

    trades.push({
      entryDate: position.entryDate,
      entryPrice: position.entryPrice,
      exitDate: lastPrice.date,
      exitPrice,
      quantity: position.quantity,
      profit,
      profitPercent,
      holdingPeriod,
      type: profit >= 0 ? 'win' : 'loss'
    })
  }

  // Calculate metrics
  const finalCapital = cash
  const totalReturn = finalCapital - initialCapital
  const totalReturnPercent = (totalReturn / initialCapital) * 100

  const winningTrades = trades.filter(t => t.type === 'win').length
  const losingTrades = trades.filter(t => t.type === 'loss').length
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0

  const wins = trades.filter(t => t.type === 'win')
  const losses = trades.filter(t => t.type === 'loss')

  const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0
  const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length) : 0

  const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.profit)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.profit)) : 0

  const averageHoldingPeriod = trades.length > 0
    ? trades.reduce((sum, t) => sum + t.holdingPeriod, 0) / trades.length
    : 0

  const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0)
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

  // Simplified Sharpe Ratio calculation
  const returns = trades.map(t => t.profitPercent)
  const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)
    : 0
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0

  return {
    strategy: strategy.name,
    symbol,
    startDate: historicalData[200].date,
    endDate: historicalData[historicalData.length - 1].date,
    initialCapital,
    finalCapital,
    totalReturn,
    totalReturnPercent,
    trades,
    winningTrades,
    losingTrades,
    winRate,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    maxDrawdown,
    sharpeRatio,
    numberOfTrades: trades.length,
    averageHoldingPeriod,
    profitFactor
  }
}

/**
 * Predefined Trading Strategies
 */

export const STRATEGIES: Record<string, BacktestStrategy> = {
  rsi_oversold: {
    name: 'RSI Oversold/Overbought',
    buySignal: (analysis) => analysis.rsi.signal === 'oversold',
    sellSignal: (analysis) => analysis.rsi.signal === 'overbought',
    stopLoss: 5,
    takeProfit: 10
  },

  macd_crossover: {
    name: 'MACD Crossover',
    buySignal: (analysis) => analysis.macd.trend === 'bullish' && analysis.macd.histogram > 0,
    sellSignal: (analysis) => analysis.macd.trend === 'bearish' && analysis.macd.histogram < 0,
    stopLoss: 3,
    takeProfit: 8
  },

  bollinger_bounce: {
    name: 'Bollinger Band Bounce',
    buySignal: (analysis) => analysis.bollingerBands.position === 'below',
    sellSignal: (analysis) => analysis.bollingerBands.position === 'above',
    stopLoss: 4,
    takeProfit: 6
  },

  moving_average_crossover: {
    name: 'Moving Average Crossover',
    buySignal: (analysis) =>
      analysis.movingAverages.trend === 'bullish' &&
      analysis.movingAverages.sma20 > analysis.movingAverages.sma50,
    sellSignal: (analysis) =>
      analysis.movingAverages.trend === 'bearish' &&
      analysis.movingAverages.sma20 < analysis.movingAverages.sma50,
    stopLoss: 5,
    takeProfit: 12
  },

  combined_signals: {
    name: 'Combined Signals',
    buySignal: (analysis) => analysis.overallSignal === 'strong_buy' || analysis.overallSignal === 'buy',
    sellSignal: (analysis) => analysis.overallSignal === 'strong_sell' || analysis.overallSignal === 'sell',
    stopLoss: 7,
    takeProfit: 15
  }
}
