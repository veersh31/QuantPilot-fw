'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calculator, TrendingUp, Shield, DollarSign, AlertTriangle } from 'lucide-react'

export function RiskCalculator({ portfolio }: { portfolio?: any[] }) {
  // Position Sizing State
  const [accountSize, setAccountSize] = useState('')
  const [riskPercent, setRiskPercent] = useState('2')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')

  // Risk/Reward State
  const [rrEntryPrice, setRrEntryPrice] = useState('')
  const [rrStopLoss, setRrStopLoss] = useState('')
  const [rrTakeProfit, setRrTakeProfit] = useState('')
  const [rrPositionSize, setRrPositionSize] = useState('')

  // Calculate portfolio value if available
  const portfolioValue = portfolio?.reduce((sum, stock) => {
    return sum + (stock.price * stock.quantity)
  }, 0) || 0

  // Position Sizing Calculations
  const calculatePositionSize = () => {
    const account = parseFloat(accountSize) || portfolioValue
    const risk = parseFloat(riskPercent)
    const entry = parseFloat(entryPrice)
    const stop = parseFloat(stopLoss)

    if (!account || !risk || !entry || !stop) {
      return null
    }

    const riskAmount = account * (risk / 100)
    const priceRisk = Math.abs(entry - stop)
    const shares = Math.floor(riskAmount / priceRisk)
    const positionValue = shares * entry
    const actualRisk = shares * priceRisk

    return {
      shares,
      positionValue,
      riskAmount: actualRisk,
      percentOfPortfolio: (positionValue / account) * 100,
      stopLossPercent: ((stop - entry) / entry) * 100
    }
  }

  // Risk/Reward Calculations
  const calculateRiskReward = () => {
    const entry = parseFloat(rrEntryPrice)
    const stop = parseFloat(rrStopLoss)
    const target = parseFloat(rrTakeProfit)
    const shares = parseFloat(rrPositionSize)

    if (!entry || !stop || !target) {
      return null
    }

    const risk = Math.abs(entry - stop)
    const reward = Math.abs(target - entry)
    const ratio = reward / risk

    const potentialLoss = shares ? shares * risk : risk
    const potentialProfit = shares ? shares * reward : reward

    return {
      riskAmount: risk,
      rewardAmount: reward,
      ratio: ratio,
      potentialLoss,
      potentialProfit,
      riskPercent: ((stop - entry) / entry) * 100,
      rewardPercent: ((target - entry) / entry) * 100
    }
  }

  const positionResult = calculatePositionSize()
  const rrResult = calculateRiskReward()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator size={24} />
          Risk Management Calculator
        </CardTitle>
        <CardDescription>
          Professional tools for position sizing and risk/reward analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="position" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="position">Position Sizing</TabsTrigger>
            <TabsTrigger value="riskreward">Risk/Reward</TabsTrigger>
          </TabsList>

          {/* Position Sizing Tab */}
          <TabsContent value="position" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountSize">Account Size ($)</Label>
                <Input
                  id="accountSize"
                  type="number"
                  placeholder={portfolioValue > 0 ? portfolioValue.toFixed(2) : "100000"}
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                />
                {portfolioValue > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current portfolio: ${portfolioValue.toLocaleString()}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="riskPercent">Risk per Trade (%)</Label>
                <Input
                  id="riskPercent"
                  type="number"
                  placeholder="2"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: 1-2% per trade
                </p>
              </div>

              <div>
                <Label htmlFor="entryPrice">Entry Price ($)</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  placeholder="150.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="stopLoss">Stop Loss ($)</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  placeholder="145.00"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  step="0.01"
                />
              </div>
            </div>

            {positionResult && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="text-primary" size={18} />
                  Position Size Recommendation
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Shares to Buy</p>
                    <p className="text-2xl font-bold text-primary">{positionResult.shares}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position Value</p>
                    <p className="text-2xl font-bold">${positionResult.positionValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Amount</p>
                    <p className="text-2xl font-bold text-destructive">${positionResult.riskAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">% of Portfolio</p>
                    <p className="text-lg font-semibold">{positionResult.percentOfPortfolio.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stop Loss %</p>
                    <p className="text-lg font-semibold text-destructive">{positionResult.stopLossPercent.toFixed(2)}%</p>
                  </div>
                </div>

                {positionResult.percentOfPortfolio > 10 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <strong>Warning:</strong> Position exceeds 10% of portfolio - consider diversification
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Risk/Reward Tab */}
          <TabsContent value="riskreward" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rrEntryPrice">Entry Price ($)</Label>
                <Input
                  id="rrEntryPrice"
                  type="number"
                  placeholder="150.00"
                  value={rrEntryPrice}
                  onChange={(e) => setRrEntryPrice(e.target.value)}
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="rrPositionSize">Position Size (shares)</Label>
                <Input
                  id="rrPositionSize"
                  type="number"
                  placeholder="100"
                  value={rrPositionSize}
                  onChange={(e) => setRrPositionSize(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="rrStopLoss">Stop Loss ($)</Label>
                <Input
                  id="rrStopLoss"
                  type="number"
                  placeholder="145.00"
                  value={rrStopLoss}
                  onChange={(e) => setRrStopLoss(e.target.value)}
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="rrTakeProfit">Take Profit Target ($)</Label>
                <Input
                  id="rrTakeProfit"
                  type="number"
                  placeholder="160.00"
                  value={rrTakeProfit}
                  onChange={(e) => setRrTakeProfit(e.target.value)}
                  step="0.01"
                />
              </div>
            </div>

            {rrResult && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="text-chart-1" size={18} />
                  Risk/Reward Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <p className="text-sm text-muted-foreground">Risk/Reward Ratio</p>
                    <p className={`text-4xl font-bold ${rrResult.ratio >= 2 ? 'text-chart-1' : rrResult.ratio >= 1 ? 'text-amber-500' : 'text-destructive'}`}>
                      1:{rrResult.ratio.toFixed(2)}
                    </p>
                    {rrResult.ratio < 2 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Professional traders aim for minimum 1:2 ratio
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Risk per Share</p>
                    <p className="text-xl font-bold text-destructive">${rrResult.riskAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{rrResult.riskPercent.toFixed(2)}%</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Reward per Share</p>
                    <p className="text-xl font-bold text-chart-1">${rrResult.rewardAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{rrResult.rewardPercent.toFixed(2)}%</p>
                  </div>

                  {parseFloat(rrPositionSize) > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Potential Loss</p>
                        <p className="text-xl font-bold text-destructive">-${rrResult.potentialLoss.toFixed(2)}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Potential Profit</p>
                        <p className="text-xl font-bold text-chart-1">+${rrResult.potentialProfit.toFixed(2)}</p>
                      </div>
                    </>
                  )}
                </div>

                {rrResult.ratio < 1.5 && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive flex items-center gap-2">
                      <AlertTriangle size={14} />
                      <strong>Poor Risk/Reward:</strong> This trade offers insufficient reward for the risk. Consider adjusting targets.
                    </p>
                  </div>
                )}

                {rrResult.ratio >= 2 && (
                  <div className="mt-3 p-3 rounded-lg bg-chart-1/10 border border-chart-1/20">
                    <p className="text-xs text-chart-1 font-medium">
                      ✓ Good Risk/Reward Ratio - This trade meets professional standards
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Pro Tip:</strong> Never risk more than 2% of your account on a single trade. Use stop losses to limit downside and aim for risk/reward ratios of at least 1:2.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
