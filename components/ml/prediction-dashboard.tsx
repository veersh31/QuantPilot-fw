'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, TrendingDown, RefreshCw, AlertCircle, Activity, Target, BarChart3, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api-client'
import type { MLPredictionResponse } from '@/types/ml'

interface PredictionDashboardProps {
  symbol: string
}

export function PredictionDashboard({ symbol }: PredictionDashboardProps) {
  const [loading, setLoading] = useState(false)
  const [predictions, setPredictions] = useState<MLPredictionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPredictions = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiClient.post<MLPredictionResponse>('/ml/predict', { symbol })
      setPredictions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('[ML Dashboard] Error:', err)
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
      <Card className="border-muted">
        <CardContent className="py-16 text-center">
          <Brain className="mx-auto mb-4 text-muted-foreground/40" size={56} />
          <h3 className="font-semibold text-lg mb-2">ML Prediction Analysis</h3>
          <p className="text-muted-foreground text-sm">Select a stock or ETF to view AI-powered predictions</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="text-destructive" size={48} />
            <div>
              <h3 className="font-semibold text-lg mb-1">Prediction Error</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchPredictions} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading || !predictions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { predictions: preds, backtest, dataPoints } = predictions
  const { nextDay, nextWeek, nextMonth } = preds.predictions
  const currentPrice = preds.currentPrice || 0

  // Calculate returns with safe navigation
  const nextDayReturn = nextDay?.predictedPrice ? ((nextDay.predictedPrice - currentPrice) / currentPrice * 100) : 0
  const nextWeekReturn = nextWeek?.predictedPrice ? ((nextWeek.predictedPrice - currentPrice) / currentPrice * 100) : 0
  const nextMonthReturn = nextMonth?.predictedPrice ? ((nextMonth.predictedPrice - currentPrice) / currentPrice * 100) : 0

  // Recommendation styling
  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'STRONG_BUY': return { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' }
      case 'BUY': return { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' }
      case 'HOLD': return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' }
      case 'SELL': return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' }
      case 'STRONG_SELL': return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' }
      default: return { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' }
    }
  }

  const recStyle = getRecommendationStyle(preds.recommendation)

  return (
    <div className="space-y-6">
      {/* Executive Summary Header */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                ML Price Analysis: {symbol}
              </CardTitle>
              <CardDescription className="text-sm">
                Ensemble forecast from {Object.keys(preds?.modelPerformances || {}).length} machine learning models • {dataPoints || 0} data points analyzed
              </CardDescription>
            </div>
            <Button onClick={fetchPredictions} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Current Price */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">CURRENT PRICE</p>
              <p className="text-3xl font-bold tracking-tight">${currentPrice.toFixed(2)}</p>
            </div>

            {/* Recommendation */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">RECOMMENDATION</p>
              <Badge className={`${recStyle.bg} ${recStyle.text} border-2 ${recStyle.border} px-3 py-1.5 text-sm font-bold`}>
                {preds.recommendation.replace('_', ' ')}
              </Badge>
            </div>

            {/* Confidence */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">CONFIDENCE</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{((preds?.confidence ?? 0) * 100).toFixed(0)}%</p>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(preds?.confidence ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Expected Return */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">7-DAY OUTLOOK</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${nextWeekReturn >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {nextWeekReturn >= 0 ? '+' : ''}{nextWeekReturn.toFixed(2)}%
                </p>
                {nextWeekReturn >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Predictions - Professional Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1-Day Forecast */}
        <Card className="border-muted hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              1-DAY FORECAST
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-bold">${(nextDay?.predictedPrice ?? 0).toFixed(2)}</p>
                <p className={`text-lg font-semibold ${nextDayReturn >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {nextDayReturn >= 0 ? '+' : ''}{nextDayReturn.toFixed(2)}%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Range: ${(nextDay?.lowerBound ?? 0).toFixed(2)} - ${(nextDay?.upperBound ?? 0).toFixed(2)}
              </p>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Model Confidence</span>
                <span className="text-sm font-bold">{((nextDay?.confidence ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(nextDay?.confidence ?? 0) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5-Day Forecast */}
        <Card className="border-muted hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4" />
              5-DAY FORECAST
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-bold">${(nextWeek?.predictedPrice ?? 0).toFixed(2)}</p>
                <p className={`text-lg font-semibold ${nextWeekReturn >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {nextWeekReturn >= 0 ? '+' : ''}{nextWeekReturn.toFixed(2)}%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Range: ${(nextWeek?.lowerBound ?? 0).toFixed(2)} - ${(nextWeek?.upperBound ?? 0).toFixed(2)}
              </p>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Model Confidence</span>
                <span className="text-sm font-bold">{((nextWeek?.confidence ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(nextWeek?.confidence ?? 0) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 20-Day Forecast */}
        <Card className="border-muted hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              20-DAY FORECAST
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-3xl font-bold">${(nextMonth?.predictedPrice ?? 0).toFixed(2)}</p>
                <p className={`text-lg font-semibold ${nextMonthReturn >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {nextMonthReturn >= 0 ? '+' : ''}{nextMonthReturn.toFixed(2)}%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Range: ${(nextMonth?.lowerBound ?? 0).toFixed(2)} - ${(nextMonth?.upperBound ?? 0).toFixed(2)}
              </p>
            </div>

            <Separator />

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Model Confidence</span>
                <span className="text-sm font-bold">{((nextMonth?.confidence ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(nextMonth?.confidence ?? 0) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Insights */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono">
            {preds.analysis}
          </p>
        </CardContent>
      </Card>

      {/* Backtest Performance */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Strategy Backtesting Results
          </CardTitle>
          <CardDescription>Historical performance simulation based on ML signals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Return</p>
              <p className={`text-xl font-bold ${(backtest?.totalReturns ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                {(backtest?.totalReturns ?? 0) >= 0 ? '+' : ''}{(backtest?.totalReturns ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Annualized</p>
              <p className={`text-xl font-bold ${(backtest?.annualizedReturns ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                {(backtest?.annualizedReturns ?? 0) >= 0 ? '+' : ''}{(backtest?.annualizedReturns ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Sharpe Ratio</p>
              <p className="text-xl font-bold">{(backtest?.sharpeRatio ?? 0).toFixed(2)}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Max Drawdown</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-500">
                {(backtest?.maxDrawdown ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Win Rate</p>
              <p className="text-xl font-bold">{(backtest?.winRate ?? 0).toFixed(1)}%</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Profit Factor</p>
              <p className="text-xl font-bold">{(backtest?.profitFactor ?? 0).toFixed(2)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Simulated {backtest?.trades?.length ?? 0} trades with $10,000 initial capital
          </p>
        </CardContent>
      </Card>

      {/* Model Performance Metrics */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Model Performance Metrics</CardTitle>
          <CardDescription>Accuracy on historical test data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {preds.modelPerformances && Object.entries(preds.modelPerformances).map(([modelName, performance]: [string, any]) => (
              <div key={modelName} className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="font-semibold text-sm mb-3">{modelName}</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">MAE</p>
                    <p className="font-bold text-sm">${(performance?.mae ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">RMSE</p>
                    <p className="font-bold text-sm">${(performance?.rmse ?? 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">MAPE</p>
                    <p className="font-bold text-sm">{(performance?.mape ?? 0).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">R²</p>
                    <p className="font-bold text-sm">{(performance?.r2 ?? 0).toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                    <p className="font-bold text-sm">{(performance?.directional_accuracy ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )) || <p className="text-sm text-muted-foreground text-center py-4">No model performance data available</p>}
          </div>
        </CardContent>
      </Card>

      {/* Feature Importance */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Key Predictive Factors</CardTitle>
          <CardDescription>Most influential features in the prediction model</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {preds.featureImportance?.slice(0, 10).map((feature: any, idx: number) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{feature?.feature || 'Unknown'}</span>
                  <span className="text-sm font-bold text-primary">{((feature?.importance ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(feature?.importance ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            )) || <p className="text-sm text-muted-foreground text-center py-4">No feature importance data available</p>}
          </div>
        </CardContent>
      </Card>

      {/* Risk Disclaimer */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-500">Investment Disclaimer</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                These ML predictions are for informational purposes only and should not be considered financial advice.
                Past performance does not guarantee future results. Machine learning models have inherent limitations
                and may be inaccurate. Always conduct your own research and consult with a qualified financial advisor
                before making investment decisions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
