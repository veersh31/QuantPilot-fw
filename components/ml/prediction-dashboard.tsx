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
        const errorData = await response.json()
        console.error('[ML Dashboard] Error details:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to fetch predictions')
      }

      const data = await response.json()
      setPredictions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header Card - Modern Glassmorphism */}
      <Card className="relative overflow-hidden border-none shadow-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />

        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                  <Brain className="text-blue-400" size={28} />
                </div>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  ML Price Predictions for {symbol}
                </span>
              </CardTitle>
              <CardDescription className="mt-3 text-base">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 backdrop-blur-sm">
                  Ensemble of {Object.keys(preds.modelPerformances).length} trained ML models • {dataPoints} data points
                </span>
              </CardDescription>
            </div>
            <Button
              onClick={fetchPredictions}
              variant="outline"
              size="sm"
              className="hover:scale-105 transition-transform duration-200 hover:shadow-lg"
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">Current Price</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                ${currentPrice.toFixed(2)}
              </p>
            </div>
            <div className={`px-6 py-3 rounded-xl ${getRecommendationColor(preds.recommendation)} shadow-lg transform hover:scale-105 transition-all duration-300`}>
              <p className="text-xs font-semibold opacity-70 tracking-wider">ML RECOMMENDATION</p>
              <p className="text-xl font-bold mt-1">{preds.recommendation.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Day */}
        <Card className="relative group hover:shadow-2xl transition-all duration-300 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-background overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Target size={18} className="text-blue-500" />
              </div>
              Next Day
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextDay.predictedPrice.toFixed(2)}
                  {nextDayReturn > 0 ? (
                    <TrendingUp className="text-chart-1 animate-pulse" size={24} />
                  ) : (
                    <TrendingDown className="text-destructive animate-pulse" size={24} />
                  )}
                </p>
                <p className={`text-base font-bold mt-1 ${nextDayReturn >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  {nextDayReturn >= 0 ? '+' : ''}{nextDayReturn.toFixed(2)}%
                </p>
              </div>

              {/* Animated Confidence Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Confidence</span>
                  <span className="font-bold">{(nextDay.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${nextDay.confidence * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-semibold">
                    ${nextDay.lowerBound.toFixed(2)} - ${nextDay.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Week */}
        <Card className="relative group hover:shadow-2xl transition-all duration-300 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-background overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Activity size={18} className="text-purple-500" />
              </div>
              Next Week (5 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextWeek.predictedPrice.toFixed(2)}
                  {nextWeekReturn > 0 ? (
                    <TrendingUp className="text-chart-1 animate-pulse" size={24} />
                  ) : (
                    <TrendingDown className="text-destructive animate-pulse" size={24} />
                  )}
                </p>
                <p className={`text-base font-bold mt-1 ${nextWeekReturn >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  {nextWeekReturn >= 0 ? '+' : ''}{nextWeekReturn.toFixed(2)}%
                </p>
              </div>

              {/* Animated Confidence Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Confidence</span>
                  <span className="font-bold">{(nextWeek.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${nextWeek.confidence * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-semibold">
                    ${nextWeek.lowerBound.toFixed(2)} - ${nextWeek.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Month */}
        <Card className="relative group hover:shadow-2xl transition-all duration-300 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-background overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/20">
                <BarChart3 size={18} className="text-orange-500" />
              </div>
              Next Month (20 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold flex items-center gap-2">
                  ${nextMonth.predictedPrice.toFixed(2)}
                  {nextMonthReturn > 0 ? (
                    <TrendingUp className="text-chart-1 animate-pulse" size={24} />
                  ) : (
                    <TrendingDown className="text-destructive animate-pulse" size={24} />
                  )}
                </p>
                <p className={`text-base font-bold mt-1 ${nextMonthReturn >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  {nextMonthReturn >= 0 ? '+' : ''}{nextMonthReturn.toFixed(2)}%
                </p>
              </div>

              {/* Animated Confidence Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Confidence</span>
                  <span className="font-bold">{(nextMonth.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${nextMonth.confidence * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-semibold">
                    ${nextMonth.lowerBound.toFixed(2)} - ${nextMonth.upperBound.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ML Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-sm whitespace-pre-line font-mono">{preds.analysis}</p>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-2">Overall Confidence: {(preds.confidence * 100).toFixed(1)}%</p>
              <p>Models used: Linear Regression, Random Forest, Exponential Smoothing, ARIMA</p>
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
      <Card className="border-blue-500/20 hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg">Top Predictive Features</CardTitle>
          <CardDescription>Most important factors influencing the prediction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preds.featureImportance.slice(0, 10).map((feature: any, idx: number) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-medium text-foreground/90 truncate max-w-[60%]">{feature.feature}</div>
                  <div className="text-sm font-bold text-blue-500">{(feature.importance * 100).toFixed(1)}%</div>
                </div>
                <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 rounded-full transition-all duration-1000 ease-out group-hover:from-blue-600 group-hover:via-blue-500 group-hover:to-blue-400"
                    style={{ width: `${feature.importance * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backtest Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backtesting Results</CardTitle>
          <CardDescription>Historical performance of ML trading strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Total Returns</p>
              <p className={`text-xl font-bold ${backtest.totalReturns >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                {backtest.totalReturns >= 0 ? '+' : ''}{backtest.totalReturns.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Annualized</p>
              <p className={`text-xl font-bold ${backtest.annualizedReturns >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                {backtest.annualizedReturns >= 0 ? '+' : ''}{backtest.annualizedReturns.toFixed(2)}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Sharpe Ratio</p>
              <p className="text-xl font-bold">{backtest.sharpeRatio.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Max Drawdown</p>
              <p className="text-xl font-bold text-destructive">-{backtest.maxDrawdown.toFixed(2)}%</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold">{backtest.winRate.toFixed(1)}%</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Profit Factor</p>
              <p className="text-xl font-bold">{backtest.profitFactor.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Based on {backtest.trades.length} trades • Initial capital: $10,000
          </p>
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
