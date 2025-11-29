/**
 * TypeScript types for ML Prediction API responses
 */

export interface PredictionTimeframe {
  predictedPrice: number
  predictedReturn: number
  confidence: number
  lowerBound: number
  upperBound: number
}

export interface ModelPerformance {
  mae: number
  rmse: number
  mape: number
  r2: number
  directional_accuracy?: number
}

export interface FeatureImportance {
  feature: string
  importance: number
}

export interface BacktestTrade {
  date: string
  action: 'BUY' | 'SELL'
  price: number
  shares: number
  predicted_price?: number
  confidence?: number
  profit?: number
  reason?: string
}

export interface BacktestResults {
  totalReturns: number
  annualizedReturns: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  trades: BacktestTrade[]
  numTrades: number
  numWins: number
  numLosses: number
}

export interface MLPredictions {
  symbol: string
  currentPrice: number
  predictions: {
    nextDay: PredictionTimeframe
    nextWeek: PredictionTimeframe
    nextMonth: PredictionTimeframe
  }
  modelPerformances: Record<string, ModelPerformance>
  featureImportance: FeatureImportance[]
  confidence: number
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  analysis: string
}

export interface MLPredictionResponse {
  predictions: MLPredictions
  backtest: BacktestResults
  dataPoints: number
  lastUpdate: string
}
