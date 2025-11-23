/**
 * Professional ML Prediction Engine
 * Combines multiple models for robust predictions with confidence intervals
 */

import { PriceData } from '../technical-indicators'
import {
  engineerDataset,
  normalizeFeatures,
  denormalizePredictions,
  extractFeatures,
  MLFeatures,
} from './feature-engineering'
import {
  LinearRegressionModel,
  RandomForestModel,
  ExponentialSmoothingModel,
  ARIMAModel,
  calculatePerformance,
  ModelPerformance,
  PredictionResult,
} from './prediction-models'

export interface EnsemblePrediction {
  symbol: string
  currentPrice: number
  predictions: {
    nextDay: PredictionResult
    nextWeek: PredictionResult
    nextMonth: PredictionResult
  }
  modelPerformances: {
    [modelName: string]: ModelPerformance
  }
  featureImportance: {
    feature: string
    importance: number
  }[]
  confidence: number
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  analysis: string
}

export interface BacktestResult {
  totalReturns: number
  annualizedReturns: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  trades: {
    date: string
    action: 'BUY' | 'SELL'
    price: number
    predictedPrice: number
    profit: number
  }[]
}

/**
 * Main Prediction Engine
 */
export class PredictionEngine {
  private linearModel: LinearRegressionModel
  private randomForest: RandomForestModel
  private exponentialSmoothing: ExponentialSmoothingModel
  private arimaModel: ARIMAModel
  private targetMean: number = 0
  private targetStd: number = 1
  private featureMeans: number[] = []
  private featureStds: number[] = []

  constructor() {
    this.linearModel = new LinearRegressionModel()
    this.randomForest = new RandomForestModel()
    this.exponentialSmoothing = new ExponentialSmoothingModel()
    this.arimaModel = new ARIMAModel()
  }

  /**
   * Train all models on historical data
   */
  async trainModels(historicalData: PriceData[]): Promise<void> {
    console.log('[ML Engine] Engineering features...')
    console.log('[ML Engine] Historical data points:', historicalData.length)

    const dataset = engineerDataset(historicalData, 1)
    console.log('[ML Engine] Features extracted:', dataset.features.length)

    if (dataset.features.length < 50) {
      throw new Error(`Insufficient data for training. Need at least 50 data points, got ${dataset.features.length}. Raw data: ${historicalData.length} points.`)
    }

    // Normalize features
    const { normalized, means, stds } = normalizeFeatures(dataset.features)
    this.featureMeans = means
    this.featureStds = stds

    // Normalize targets too
    this.targetMean = dataset.targets.reduce((sum, val) => sum + val, 0) / dataset.targets.length
    this.targetStd = Math.sqrt(
      dataset.targets.reduce((sum, val) => sum + Math.pow(val - this.targetMean, 2), 0) / dataset.targets.length
    )
    const normalizedTargets = dataset.targets.map(t => (t - this.targetMean) / this.targetStd)

    console.log('[ML Engine] Target normalization - Mean:', this.targetMean.toFixed(2), 'Std:', this.targetStd.toFixed(2))

    // Train statistical models
    console.log('[ML Engine] Training Linear Regression...')
    this.linearModel.train(normalized, normalizedTargets)

    console.log('[ML Engine] Training Random Forest...')
    this.randomForest.train(normalized, normalizedTargets)

    // Time series models
    console.log('[ML Engine] Training Exponential Smoothing...')
    const prices = historicalData.map(d => d.close)
    this.exponentialSmoothing.train(prices)

    console.log('[ML Engine] Training ARIMA...')
    this.arimaModel.train(prices)

    console.log('[ML Engine] Training complete')
  }

  /**
   * Generate predictions for multiple timeframes
   */
  async predict(
    historicalData: PriceData[],
    symbol: string
  ): Promise<EnsemblePrediction> {
    // Extract current features
    const currentFeatures = extractFeatures(historicalData, historicalData.length - 1)
    if (!currentFeatures) {
      throw new Error('Unable to extract features from current data')
    }

    const currentPrice = historicalData[historicalData.length - 1].close

    // Normalize current features
    const dataset = engineerDataset(historicalData, 1)
    const { normalized, means, stds, featureNames } = normalizeFeatures(dataset.features)
    const currentNormalized = normalized[normalized.length - 1]

    // Get predictions from each model
    const predictions = await this.generatePredictions(
      currentNormalized,
      historicalData.map(d => d.close),
      currentPrice
    )

    // Calculate model performances (on training data)
    const performances = await this.evaluateModels(historicalData)

    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(featureNames)

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(predictions, performances)

    // Generate recommendation
    const recommendation = this.generateRecommendation(predictions.nextDay, currentPrice, confidence)

    // Generate analysis
    const analysis = this.generateAnalysis(predictions, performances, currentPrice)

    return {
      symbol,
      currentPrice,
      predictions,
      modelPerformances: performances,
      featureImportance,
      confidence,
      recommendation,
      analysis,
    }
  }

  /**
   * Generate predictions from all models
   */
  private async generatePredictions(
    currentFeatures: number[],
    historicalPrices: number[],
    currentPrice: number
  ): Promise<EnsemblePrediction['predictions']> {
    // Next day predictions
    const [lrPredNextDay, lrConf] = this.linearModel.predict(currentFeatures)
    const [rfPredNextDay, rfConf] = this.randomForest.predict(currentFeatures)
    const [esPredNextDay, esConf] = this.exponentialSmoothing.predict(1)
    const [arimaPredNextDay, arimaConf] = this.arimaModel.predict(historicalPrices, 1)

    // Ensemble next day prediction
    const weights = [0.3, 0.3, 0.2, 0.2] // Weights for each model
    const nextDayPred = (
      lrPredNextDay * weights[0] +
      rfPredNextDay * weights[1] +
      esPredNextDay * weights[2] +
      arimaPredNextDay * weights[3]
    )
    const nextDayConf = (lrConf * weights[0] + rfConf * weights[1] + esConf * weights[2] + arimaConf * weights[3])

    // Calculate confidence intervals (±2 standard deviations)
    const stdDev = Math.abs(nextDayPred - currentPrice) * 0.1
    const nextDay: PredictionResult = {
      predictedPrice: nextDayPred,
      confidence: nextDayConf,
      lowerBound: nextDayPred - 2 * stdDev,
      upperBound: nextDayPred + 2 * stdDev,
      modelName: 'Ensemble',
    }

    // Next week prediction (5 days)
    const [esNextWeek] = this.exponentialSmoothing.predict(5)
    const [arimaNextWeek] = this.arimaModel.predict(historicalPrices, 5)
    const nextWeekPred = (esNextWeek * 0.5 + arimaNextWeek * 0.5)
    const nextWeekStd = Math.abs(nextWeekPred - currentPrice) * 0.15
    const nextWeek: PredictionResult = {
      predictedPrice: nextWeekPred,
      confidence: Math.max(0.5, nextDayConf - 0.1),
      lowerBound: nextWeekPred - 2 * nextWeekStd,
      upperBound: nextWeekPred + 2 * nextWeekStd,
      modelName: 'Time Series Ensemble',
    }

    // Next month prediction (20 trading days)
    const [esNextMonth] = this.exponentialSmoothing.predict(20)
    const [arimaNextMonth] = this.arimaModel.predict(historicalPrices, 20)
    const nextMonthPred = (esNextMonth * 0.5 + arimaNextMonth * 0.5)
    const nextMonthStd = Math.abs(nextMonthPred - currentPrice) * 0.2
    const nextMonth: PredictionResult = {
      predictedPrice: nextMonthPred,
      confidence: Math.max(0.4, nextDayConf - 0.2),
      lowerBound: nextMonthPred - 2 * nextMonthStd,
      upperBound: nextMonthPred + 2 * nextMonthStd,
      modelName: 'Time Series Ensemble',
    }

    return { nextDay, nextWeek, nextMonth }
  }

  /**
   * Evaluate model performances on historical data
   */
  private async evaluateModels(
    historicalData: PriceData[]
  ): Promise<{ [key: string]: ModelPerformance }> {
    const dataset = engineerDataset(historicalData, 1)
    const { normalized } = normalizeFeatures(dataset.features)

    // Use last 20% for evaluation
    const splitIndex = Math.floor(normalized.length * 0.8)
    const testX = normalized.slice(splitIndex)
    const testY = dataset.targets.slice(splitIndex)

    // Get predictions from each model
    const lrPredictions = testX.map(x => this.linearModel.predict(x)[0])
    const rfPredictions = testX.map(x => this.randomForest.predict(x)[0])

    const performances: { [key: string]: ModelPerformance } = {
      'Linear Regression': calculatePerformance(testY, lrPredictions),
      'Random Forest': calculatePerformance(testY, rfPredictions),
    }

    return performances
  }

  /**
   * Calculate feature importance
   */
  private calculateFeatureImportance(featureNames: string[]): {
    feature: string
    importance: number
  }[] {
    const importance = this.linearModel.getFeatureImportance()

    const featureImportance = featureNames.map((name, idx) => ({
      feature: name,
      importance: importance[idx],
    }))

    // Sort by importance
    featureImportance.sort((a, b) => b.importance - a.importance)

    // Normalize to sum to 1
    const total = featureImportance.reduce((sum, f) => sum + f.importance, 0)
    featureImportance.forEach(f => {
      f.importance = total > 0 ? f.importance / total : 0
    })

    return featureImportance.slice(0, 10) // Top 10
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    predictions: EnsemblePrediction['predictions'],
    performances: { [key: string]: ModelPerformance }
  ): number {
    // Average model confidence
    const avgConfidence = predictions.nextDay.confidence

    // Average model performance (R²)
    const avgR2 = Object.values(performances).reduce((sum, p) => sum + p.r2, 0) / Object.keys(performances).length

    // Combined confidence
    return (avgConfidence * 0.6 + Math.max(0, avgR2) * 0.4)
  }

  /**
   * Generate buy/sell recommendation
   */
  private generateRecommendation(
    prediction: PredictionResult,
    currentPrice: number,
    confidence: number
  ): EnsemblePrediction['recommendation'] {
    const expectedReturn = (prediction.predictedPrice - currentPrice) / currentPrice

    if (confidence < 0.5) return 'HOLD'

    if (expectedReturn > 0.05 && confidence > 0.7) return 'STRONG_BUY'
    if (expectedReturn > 0.02) return 'BUY'
    if (expectedReturn < -0.05 && confidence > 0.7) return 'STRONG_SELL'
    if (expectedReturn < -0.02) return 'SELL'

    return 'HOLD'
  }

  /**
   * Generate analysis text
   */
  private generateAnalysis(
    predictions: EnsemblePrediction['predictions'],
    performances: { [key: string]: ModelPerformance },
    currentPrice: number
  ): string {
    const nextDayReturn = ((predictions.nextDay.predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)
    const nextWeekReturn = ((predictions.nextWeek.predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)
    const nextMonthReturn = ((predictions.nextMonth.predictedPrice - currentPrice) / currentPrice * 100).toFixed(2)

    const avgAccuracy = Object.values(performances).reduce((sum, p) => sum + p.accuracy, 0) / Object.keys(performances).length

    let analysis = `ML models predict:\n`
    analysis += `• Next Day: ${nextDayReturn > 0 ? '+' : ''}${nextDayReturn}% (${predictions.nextDay.confidence.toFixed(1)}% confidence)\n`
    analysis += `• Next Week: ${nextWeekReturn > 0 ? '+' : ''}${nextWeekReturn}% (${predictions.nextWeek.confidence.toFixed(1)}% confidence)\n`
    analysis += `• Next Month: ${nextMonthReturn > 0 ? '+' : ''}${nextMonthReturn}% (${predictions.nextMonth.confidence.toFixed(1)}% confidence)\n\n`
    analysis += `Model Performance: ${avgAccuracy.toFixed(1)}% directional accuracy\n`
    analysis += `Confidence Interval: $${predictions.nextDay.lowerBound.toFixed(2)} - $${predictions.nextDay.upperBound.toFixed(2)}`

    return analysis
  }

  /**
   * Backtest the strategy (simplified for performance)
   */
  async backtest(
    historicalData: PriceData[],
    initialCapital: number = 10000
  ): Promise<BacktestResult> {
    console.log('[ML Engine] Starting backtest...')

    // Simplified backtesting - use the already trained model
    const dataset = engineerDataset(historicalData, 1)
    const { normalized } = normalizeFeatures(dataset.features)

    // Use last 20% for backtesting
    const splitIndex = Math.floor(normalized.length * 0.8)
    const testX = normalized.slice(splitIndex)
    const testDates = dataset.dates.slice(splitIndex)
    const testActual = dataset.targets.slice(splitIndex)

    const trades: BacktestResult['trades'] = []
    let cash = initialCapital
    let shares = 0
    let position: 'LONG' | null = null

    for (let i = 0; i < testX.length - 1; i++) {
      const [prediction] = this.linearModel.predict(testX[i])
      const currentPrice = testActual[i]
      const nextPrice = testActual[i + 1]
      const expectedReturn = (prediction - currentPrice) / currentPrice

      let profit = 0

      // Trading logic
      if (expectedReturn > 0.02 && position !== 'LONG') {
        // Buy signal
        shares = cash / currentPrice
        cash = 0
        position = 'LONG'

        trades.push({
          date: testDates[i],
          action: 'BUY',
          price: currentPrice,
          predictedPrice: prediction,
          profit: 0,
        })
      } else if (expectedReturn < -0.02 && position === 'LONG') {
        // Sell signal
        profit = shares * (currentPrice - testActual[trades[trades.length - 1] ? trades.findIndex(t => t.action === 'BUY') : 0])
        cash = shares * currentPrice
        shares = 0
        position = null

        trades.push({
          date: testDates[i],
          action: 'SELL',
          price: currentPrice,
          predictedPrice: prediction,
          profit,
        })
      }
    }

    // Close final position
    if (position === 'LONG' && shares > 0) {
      const finalPrice = testActual[testActual.length - 1]
      cash = shares * finalPrice
      shares = 0
    }

    // Calculate metrics
    const totalReturns = ((cash - initialCapital) / initialCapital) * 100
    const numYears = (testActual.length / 252)
    const annualizedReturns = numYears > 0 ? (Math.pow(cash / initialCapital, 1 / numYears) - 1) * 100 : 0

    // Calculate Sharpe Ratio
    const returns = trades.filter(t => t.profit !== 0).map(t => t.profit / initialCapital)
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0
    const stdReturn = returns.length > 0 ? Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) : 0
    const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0

    // Calculate max drawdown
    let maxDrawdown = 0
    let peak = initialCapital
    let runningValue = initialCapital

    for (const trade of trades) {
      if (trade.action === 'SELL') {
        runningValue += trade.profit
      }
      if (runningValue > peak) peak = runningValue
      const drawdown = (peak - runningValue) / peak
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    // Win rate
    const profitTrades = trades.filter(t => t.profit > 0)
    const winRate = trades.length > 0 ? (profitTrades.length / trades.filter(t => t.action === 'SELL').length) * 100 : 0

    // Profit factor
    const grossProfit = profitTrades.reduce((sum, t) => sum + t.profit, 0)
    const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 1

    console.log('[ML Engine] Backtest complete:', {
      totalReturns,
      trades: trades.length,
      winRate,
    })

    return {
      totalReturns,
      annualizedReturns,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
      winRate,
      profitFactor,
      trades,
    }
  }
}
