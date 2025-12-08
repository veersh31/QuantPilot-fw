'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, TrendingDown, Activity, AlertCircle, BarChart3, Target } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface PredictionDashboardProps {
  symbol: string
}

export function PredictionDashboard({ symbol }: PredictionDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })

      if (!response.ok) {
        let errorMessage = 'Failed to fetch predictions'
        try {
          const errorData = await response.json()
          console.error('[ML Dashboard] Error response:', errorData)
          // Check for different error field names: detail (FastAPI), details, error, message
          errorMessage = errorData.detail || errorData.details || errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, use status text
          console.error('[ML Dashboard] Failed to parse error response:', parseError)
          errorMessage = `Server error (${response.status}): ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setPredictions(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('[ML Dashboard] Error:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (symbol) {
      fetchPredictions()
    }
  }, [symbol])

  if (!symbol) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground">Select a stock or ETF to view ML predictions</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="text-destructive" size={48} />
            <div className="text-center">
              <p className="font-semibold text-destructive">Prediction Error</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={fetchPredictions} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading || !predictions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { predictions: preds, backtest, dataPoints } = predictions
  const { nextDay, nextWeek, nextMonth } = preds.predictions
  const currentPrice = preds.currentPrice

  // Calculate returns
  const nextDayReturn = ((nextDay.predictedPrice - currentPrice) / currentPrice * 100)
  const nextWeekReturn = ((nextWeek.predictedPrice - currentPrice) / currentPrice * 100)
  const nextMonthReturn = ((nextMonth.predictedPrice - currentPrice) / currentPrice * 100)

  // Recommendation styling
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'BUY': return 'text-green-500 bg-green-50 dark:bg-green-900/10'
      case 'HOLD': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'SELL': return 'text-red-500 bg-red-50 dark:bg-red-900/10'
      case 'STRONG_SELL': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-indigo-600/15 border-blue-500/30 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Brain className="text-blue-600 dark:text-blue-400" size={28} />
                </div>
                <span>ML Price Predictions</span>
              </CardTitle>
              <CardDescription className="text-base flex items-center gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{symbol}</span>
                <span className="text-muted-foreground/60">•</span>
                <span>{Object.keys(preds.modelPerformances).length} ML models</span>
                <span className="text-muted-foreground/60">•</span>
                <span>{dataPoints} data points</span>
              </CardDescription>
            </div>
            <Button onClick={fetchPredictions} variant="outline" size="sm" className="shadow-sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Market Price</p>
              <p className="text-4xl font-bold tracking-tight">${currentPrice.toFixed(2)}</p>
            </div>
            <div className={`px-6 py-3 rounded-xl shadow-md ${getRecommendationColor(preds.recommendation)}`}>
              <p className="text-xs font-bold opacity-70 tracking-wider mb-1">AI RECOMMENDATION</p>
              <p className="text-xl font-bold tracking-tight">{preds.recommendation.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Next Day */}
        <Card className="border-blue-200/50 dark:border-blue-800/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-semibold">
              <div className="p-1.5 rounded-md bg-blue-500/15">
                <Target size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span>Next Day Forecast</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextDay.predictedPrice.toFixed(2)}
                  {nextDayReturn > 0 ? (
                    <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  )}
                </p>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-bold ${nextDayReturn >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {nextDayReturn >= 0 ? '+' : ''}{nextDayReturn.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</span>
                  <span className="text-sm font-bold">{(nextDay.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Range</span>
                  <span className="text-xs font-semibold">
                    ${nextDay.lowerBound.toFixed(2)} - ${nextDay.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Week */}
        <Card className="border-purple-200/50 dark:border-purple-800/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-semibold">
              <div className="p-1.5 rounded-md bg-purple-500/15">
                <Activity size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span>Next Week (5 days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextWeek.predictedPrice.toFixed(2)}
                  {nextWeekReturn > 0 ? (
                    <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  )}
                </p>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-bold ${nextWeekReturn >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {nextWeekReturn >= 0 ? '+' : ''}{nextWeekReturn.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</span>
                  <span className="text-sm font-bold">{(nextWeek.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Range</span>
                  <span className="text-xs font-semibold">
                    ${nextWeek.lowerBound.toFixed(2)} - ${nextWeek.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Month */}
        <Card className="border-orange-200/50 dark:border-orange-800/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-semibold">
              <div className="p-1.5 rounded-md bg-orange-500/15">
                <BarChart3 size={18} className="text-orange-600 dark:text-orange-400" />
              </div>
              <span>Next Month (20 days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextMonth.predictedPrice.toFixed(2)}
                  {nextMonthReturn > 0 ? (
                    <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
                  )}
                </p>
                <div className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-bold ${nextMonthReturn >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {nextMonthReturn >= 0 ? '+' : ''}{nextMonthReturn.toFixed(2)}%
                </div>
              </div>
              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confidence</span>
                  <span className="text-sm font-bold">{(nextMonth.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Range</span>
                  <span className="text-xs font-semibold">
                    ${nextMonth.lowerBound.toFixed(2)} - ${nextMonth.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Analysis */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg font-semibold">AI Analysis & Insights</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-5">
            <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20">
              <p className="text-sm whitespace-pre-line leading-relaxed font-mono">{preds.analysis}</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Overall Model Confidence</p>
                <p className="text-2xl font-bold">{(preds.confidence * 100).toFixed(1)}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Ensemble Models</p>
                <p className="text-sm font-semibold">Ridge • Lasso • RF • GBM • ARIMA • ES</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Performance</CardTitle>
          <CardDescription>Evaluated on historical test data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(preds.modelPerformances).map(([modelName, performance]: [string, any]) => (
              <div key={modelName} className="space-y-2">
                <p className="font-semibold text-sm">{modelName}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">MAE</p>
                    <p className="font-semibold">${performance.mae.toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">RMSE</p>
                    <p className="font-semibold">${performance.rmse.toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">MAPE</p>
                    <p className="font-semibold">{performance.mape.toFixed(2)}%</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">R²</p>
                    <p className="font-semibold">{performance.r2.toFixed(3)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <p className="text-muted-foreground">Accuracy</p>
                    <p className="font-semibold">{performance.directional_accuracy?.toFixed(1) || '0.0'}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Predictive Features</CardTitle>
          <CardDescription>Most important factors influencing the prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {preds.featureImportance.slice(0, 10).map((feature: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-32 text-xs text-muted-foreground truncate">{feature.feature}</div>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${feature.importance * 100}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-right">{(feature.importance * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backtest Results */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg font-semibold">Backtesting Performance</CardTitle>
          <CardDescription className="text-sm">Historical simulation of ML trading strategy on actual market data</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Returns</p>
              <p className={`text-2xl font-bold ${backtest.totalReturns >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {backtest.totalReturns >= 0 ? '+' : ''}{backtest.totalReturns.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Annualized</p>
              <p className={`text-2xl font-bold ${backtest.annualizedReturns >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {backtest.annualizedReturns >= 0 ? '+' : ''}{backtest.annualizedReturns.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-purple-500/5 to-violet-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sharpe Ratio</p>
              <p className="text-2xl font-bold">{backtest.sharpeRatio.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-red-500/5 to-rose-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{backtest.maxDrawdown.toFixed(2)}%</p>
            </div>
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-orange-500/5 to-amber-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Win Rate</p>
              <p className="text-2xl font-bold">{backtest.winRate.toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-xl border-2 border-border/50 bg-gradient-to-br from-teal-500/5 to-cyan-500/5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Profit Factor</p>
              <p className="text-2xl font-bold">{backtest.profitFactor.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-semibold">{backtest.trades.length} trades</span> executed • Initial capital: <span className="font-semibold">$10,000</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-yellow-500 mb-1">ML Prediction Disclaimer</p>
            <p>
              These predictions are generated by machine learning models and should not be considered financial advice.
              Past performance does not guarantee future results. Markets are inherently unpredictable, and ML models
              can be wrong. Always conduct your own research and consult with a financial advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
