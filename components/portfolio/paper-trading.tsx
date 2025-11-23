'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { PaperTradingAccount, Transaction, Position, calculatePosition, calculatePortfolioSummary } from '@/lib/types/portfolio'

export function PaperTrading() {
  const [paperAccount, setPaperAccount] = useLocalStorage<PaperTradingAccount | null>('quantpilot-paper-account', null)
  const [isPaperMode, setIsPaperMode] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [startingCash, setStartingCash] = useState('100000')

  useEffect(() => {
    if (paperAccount) {
      setIsPaperMode(paperAccount.isActive)
    }
  }, [paperAccount])

  const createPaperAccount = () => {
    const cash = parseFloat(startingCash)
    if (isNaN(cash) || cash <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const account: PaperTradingAccount = {
      accountId: `paper-${Date.now()}`,
      name: 'Paper Trading Account',
      startingCash: cash,
      currentCash: cash,
      positions: [],
      transactions: [],
      summary: {
        totalValue: cash,
        totalCostBasis: 0,
        totalUnrealizedGain: 0,
        totalUnrealizedGainPercent: 0,
        totalRealizedGain: 0,
        totalDividends: 0,
        totalFees: 0,
        numberOfPositions: 0,
        cash: cash,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      isActive: true
    }

    setPaperAccount(account)
    setIsPaperMode(true)
    setShowSetup(false)
  }

  const resetAccount = () => {
    if (confirm('Are you sure you want to reset your paper trading account? All trades will be lost.')) {
      setPaperAccount(null)
      setIsPaperMode(false)
      setShowSetup(true)
    }
  }

  const togglePaperMode = (enabled: boolean) => {
    if (!paperAccount && enabled) {
      setShowSetup(true)
      return
    }

    setIsPaperMode(enabled)
    if (paperAccount) {
      setPaperAccount({
        ...paperAccount,
        isActive: enabled
      })
    }
  }

  // Calculate current account value
  const calculateAccountValue = async () => {
    if (!paperAccount) return

    const updatedPositions: Position[] = []

    for (const txn of paperAccount.transactions) {
      const symbol = txn.symbol
      let position = updatedPositions.find(p => p.symbol === symbol)

      if (!position) {
        // Fetch current price
        try {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
          })
          const data = await response.json()

          const calculatedPosition = calculatePosition(symbol, paperAccount.transactions, data.price)
          if (calculatedPosition) {
            updatedPositions.push(calculatedPosition)
          }
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error)
        }
      }
    }

    const summary = calculatePortfolioSummary(updatedPositions, paperAccount.currentCash, paperAccount.transactions)

    setPaperAccount({
      ...paperAccount,
      positions: updatedPositions,
      summary
    })
  }

  useEffect(() => {
    if (paperAccount && isPaperMode) {
      calculateAccountValue()
      const interval = setInterval(calculateAccountValue, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [isPaperMode])

  if (!paperAccount && !showSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Paper Trading
          </CardTitle>
          <CardDescription>
            Practice trading with virtual money - no real risk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm space-y-2">
                <p className="font-semibold text-blue-500">What is Paper Trading?</p>
                <p className="text-muted-foreground">
                  Paper trading allows you to practice trading strategies with virtual money.
                  All trades are simulated using real market prices, but no actual money is involved.
                </p>
                <p className="text-muted-foreground">
                  Perfect for testing strategies, learning to trade, or trying new ideas without financial risk.
                </p>
              </div>
            </div>
          </div>

          <Button onClick={() => setShowSetup(true)} className="w-full">
            Create Paper Trading Account
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (showSetup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Setup Paper Trading Account</CardTitle>
          <CardDescription>
            Start with virtual cash to practice trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Starting Cash</label>
            <div className="flex items-center gap-2">
              <DollarSign className="text-muted-foreground" size={20} />
              <Input
                type="number"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="100000"
                step="1000"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Recommended: $10,000 - $100,000 for realistic trading
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={createPaperAccount} className="flex-1">
              Create Account
            </Button>
            <Button onClick={() => setShowSetup(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!paperAccount) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Paper Trading Account
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch
              checked={isPaperMode}
              onCheckedChange={togglePaperMode}
            />
          </div>
        </CardTitle>
        <CardDescription>
          Virtual trading with ${paperAccount.startingCash.toLocaleString()} starting balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Value</p>
            <p className="text-xl font-bold">
              ${paperAccount.summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Cash Available</p>
            <p className="text-xl font-bold text-green-500">
              ${paperAccount.currentCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Total Gain/Loss</p>
            <p className={`text-xl font-bold ${paperAccount.summary.totalUnrealizedGain >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
              {paperAccount.summary.totalUnrealizedGain >= 0 ? '+' : ''}
              ${paperAccount.summary.totalUnrealizedGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${paperAccount.summary.totalUnrealizedGainPercent >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
              {paperAccount.summary.totalUnrealizedGainPercent >= 0 ? '+' : ''}
              {paperAccount.summary.totalUnrealizedGainPercent.toFixed(2)}%
            </p>
          </div>

          <div className="p-3 rounded-lg border border-border bg-card">
            <p className="text-xs text-muted-foreground mb-1">Positions</p>
            <p className="text-xl font-bold">{paperAccount.summary.numberOfPositions}</p>
          </div>
        </div>

        {/* Info Banner */}
        {isPaperMode && (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-500 font-semibold">
              Paper Trading Mode Active
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All trades will be executed with virtual money. Use the transaction manager to add trades.
            </p>
          </div>
        )}

        {/* Positions */}
        {paperAccount.positions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Current Positions</h4>
            <div className="space-y-2">
              {paperAccount.positions.map((position) => (
                <div
                  key={position.symbol}
                  className="p-3 rounded-lg border border-border hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{position.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {position.quantity} shares @ ${position.avgCost.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${position.marketValue.toFixed(2)}</p>
                      <p className={`text-xs ${position.unrealizedGain >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                        {position.unrealizedGain >= 0 ? '+' : ''}${position.unrealizedGain.toFixed(2)}
                        ({position.unrealizedGainPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-border flex gap-2">
          <Button
            onClick={calculateAccountValue}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Refresh Values
          </Button>
          <Button
            onClick={resetAccount}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            Reset Account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Created {new Date(paperAccount.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  )
}
