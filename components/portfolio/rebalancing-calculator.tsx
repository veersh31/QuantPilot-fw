'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scale, TrendingUp, AlertCircle, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface PortfolioStock {
  symbol: string
  name: string
  quantity: number
  avgCost: number
  price: number
}

interface RebalancingCalculatorProps {
  portfolio: PortfolioStock[]
}

interface StockAllocation {
  symbol: string
  currentValue: number
  currentPercent: number
  targetPercent: number
  targetValue: number
  difference: number
  action: 'BUY' | 'SELL' | 'HOLD'
  shares: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function RebalancingCalculator({ portfolio }: RebalancingCalculatorProps) {
  const [totalValue, setTotalValue] = useState(0)
  const [allocations, setAllocations] = useState<StockAllocation[]>([])
  const [targetAllocations, setTargetAllocations] = useState<{ [symbol: string]: number }>({})
  const [additionalCash, setAdditionalCash] = useState(0)

  useEffect(() => {
    if (portfolio.length === 0) return

    // Calculate total portfolio value
    const total = portfolio.reduce((sum, stock) => sum + (stock.price * stock.quantity), 0)
    setTotalValue(total)

    // Initialize allocations
    const initialAllocations: StockAllocation[] = portfolio.map(stock => {
      const currentValue = stock.price * stock.quantity
      const currentPercent = (currentValue / total) * 100

      return {
        symbol: stock.symbol,
        currentValue,
        currentPercent,
        targetPercent: targetAllocations[stock.symbol] || currentPercent,
        targetValue: 0,
        difference: 0,
        action: 'HOLD',
        shares: 0
      }
    })

    setAllocations(initialAllocations)

    // Initialize target allocations if not set
    if (Object.keys(targetAllocations).length === 0) {
      const defaultTargets: { [symbol: string]: number } = {}
      portfolio.forEach(stock => {
        const currentValue = stock.price * stock.quantity
        defaultTargets[stock.symbol] = (currentValue / total) * 100
      })
      setTargetAllocations(defaultTargets)
    }
  }, [portfolio])

  const handleTargetChange = (symbol: string, value: number) => {
    setTargetAllocations(prev => ({
      ...prev,
      [symbol]: Math.max(0, Math.min(100, value))
    }))
  }

  const calculateRebalancing = () => {
    const totalTargetPercent = Object.values(targetAllocations).reduce((sum, val) => sum + val, 0)

    if (Math.abs(totalTargetPercent - 100) > 0.01) {
      toast.error('Target allocations must sum to 100%', {
        description: `Current total: ${totalTargetPercent.toFixed(2)}%`
      })
      return
    }

    const newTotalValue = totalValue + additionalCash

    const rebalancedAllocations: StockAllocation[] = portfolio.map(stock => {
      const currentValue = stock.price * stock.quantity
      const currentPercent = (currentValue / totalValue) * 100
      const targetPercent = targetAllocations[stock.symbol] || 0
      const targetValue = (targetPercent / 100) * newTotalValue
      const difference = targetValue - currentValue
      const shares = difference / stock.price

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
      if (Math.abs(difference) > newTotalValue * 0.01) { // More than 1% difference
        action = difference > 0 ? 'BUY' : 'SELL'
      }

      return {
        symbol: stock.symbol,
        currentValue,
        currentPercent,
        targetPercent,
        targetValue,
        difference,
        action,
        shares: Math.abs(shares)
      }
    })

    setAllocations(rebalancedAllocations)
    toast.success('Rebalancing calculated successfully')
  }

  const distributeEvenly = () => {
    if (portfolio.length === 0) return

    const evenPercent = 100 / portfolio.length
    const newTargets: { [symbol: string]: number } = {}

    portfolio.forEach(stock => {
      newTargets[stock.symbol] = evenPercent
    })

    setTargetAllocations(newTargets)
    toast.success('Allocations distributed evenly')
  }

  const chartData = allocations.map(alloc => ({
    name: alloc.symbol,
    current: parseFloat(alloc.currentPercent.toFixed(2)),
    target: parseFloat(alloc.targetPercent.toFixed(2))
  }))

  if (portfolio.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Rebalancing</CardTitle>
          <CardDescription>Optimize your portfolio allocations</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Scale size={48} className="mx-auto mb-4 opacity-30" />
            <p>No portfolio holdings</p>
            <p className="text-sm mt-2">Add stocks to your portfolio to use the rebalancer</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalTargetPercent = Object.values(targetAllocations).reduce((sum, val) => sum + val, 0)
  const isValidTotal = Math.abs(totalTargetPercent - 100) < 0.01

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Portfolio Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Additional Cash</p>
              <Input
                type="number"
                value={additionalCash}
                onChange={(e) => setAdditionalCash(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">New Total Value</p>
              <p className="text-2xl font-bold">${(totalValue + additionalCash).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Allocations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Target Allocations</CardTitle>
              <CardDescription>
                Set your desired portfolio balance
                {!isValidTotal && (
                  <span className="text-destructive ml-2">
                    (Total: {totalTargetPercent.toFixed(2)}% - must equal 100%)
                  </span>
                )}
              </CardDescription>
            </div>
            <Button onClick={distributeEvenly} variant="outline" size="sm">
              Distribute Evenly
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolio.map((stock, idx) => {
              const currentAlloc = allocations.find(a => a.symbol === stock.symbol)
              return (
                <div key={stock.symbol} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {currentAlloc?.currentPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={targetAllocations[stock.symbol] || 0}
                        onChange={(e) => handleTargetChange(stock.symbol, parseFloat(e.target.value) || 0)}
                        className="text-right"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm font-medium">%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Button
            onClick={calculateRebalancing}
            disabled={!isValidTotal}
            className="w-full mt-6"
            size="lg"
          >
            <Scale size={18} className="mr-2" />
            Calculate Rebalancing
          </Button>
        </CardContent>
      </Card>

      {/* Rebalancing Actions */}
      {allocations.length > 0 && isValidTotal && (
        <Card>
          <CardHeader>
            <CardTitle>Rebalancing Actions</CardTitle>
            <CardDescription>Steps to reach your target allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allocations.map((alloc, idx) => (
                <div
                  key={alloc.symbol}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <h3 className="font-bold text-lg">{alloc.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {alloc.currentPercent.toFixed(2)}% → {alloc.targetPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      alloc.action === 'BUY' ? 'bg-green-500/20 text-green-600' :
                      alloc.action === 'SELL' ? 'bg-red-500/20 text-red-600' :
                      'bg-gray-500/20 text-gray-600'
                    }`}>
                      {alloc.action}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Value</p>
                      <p className="font-semibold">${alloc.currentValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Value</p>
                      <p className="font-semibold">${alloc.targetValue.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Difference</p>
                      <p className={`font-semibold ${alloc.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {alloc.difference >= 0 ? '+' : ''}${alloc.difference.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Shares to {alloc.action === 'BUY' ? 'Buy' : 'Sell'}</p>
                      <p className="font-semibold">
                        {alloc.action === 'HOLD' ? '-' : alloc.shares.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocation Visualization */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation Comparison</CardTitle>
            <CardDescription>Current vs Target allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Allocation */}
              <div>
                <h3 className="text-sm font-semibold text-center mb-4">Current Allocation</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, current }) => `${name} ${current}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="current"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Target Allocation */}
              <div>
                <h3 className="text-sm font-semibold text-center mb-4">Target Allocation</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, target }) => `${name} ${target}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="target"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
