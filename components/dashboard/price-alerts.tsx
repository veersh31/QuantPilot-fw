'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, BellOff, TrendingUp, TrendingDown, X, Plus } from 'lucide-react'
import { useLocalStorage } from '@/hooks/use-local-storage'

interface PriceAlert {
  id: string
  symbol: string
  targetPrice: number
  condition: 'above' | 'below'
  triggered: boolean
  createdAt: number
}

export function PriceAlerts() {
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>('quantpilot-alerts', [])
  const [newSymbol, setNewSymbol] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above')
  const [adding, setAdding] = useState(false)
  const [currentPrices, setCurrentPrices] = useState<{ [symbol: string]: number }>({})

  // Fetch current prices and check alerts
  useEffect(() => {
    const checkAlerts = async () => {
      const uniqueSymbols = Array.from(new Set(alerts.map(a => a.symbol)))

      for (const symbol of uniqueSymbols) {
        try {
          const response = await fetch('/api/stocks/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol }),
          })

          if (response.ok) {
            const data = await response.json()
            setCurrentPrices(prev => ({ ...prev, [symbol]: data.price }))

            // Check if any alerts should be triggered
            alerts.forEach(alert => {
              if (alert.symbol === symbol && !alert.triggered) {
                const shouldTrigger = alert.condition === 'above'
                  ? data.price >= alert.targetPrice
                  : data.price <= alert.targetPrice

                if (shouldTrigger) {
                  // Mark alert as triggered
                  setAlerts(alerts.map(a =>
                    a.id === alert.id ? { ...a, triggered: true } : a
                  ))

                  // Show browser notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Price Alert Triggered!', {
                      body: `${alert.symbol} is now ${alert.condition} $${alert.targetPrice}. Current price: $${data.price.toFixed(2)}`,
                      icon: '/icon.svg'
                    })
                  }
                }
              }
            })
          }
        } catch (error) {
          console.error(`Error checking alert for ${symbol}:`, error)
        }
      }
    }

    if (alerts.length > 0) {
      checkAlerts()
      const interval = setInterval(checkAlerts, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [alerts, setAlerts])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleAddAlert = () => {
    if (!newSymbol.trim() || !newPrice.trim()) return

    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return

    const alert: PriceAlert = {
      id: Date.now().toString(),
      symbol: newSymbol.toUpperCase().trim(),
      targetPrice: price,
      condition: newCondition,
      triggered: false,
      createdAt: Date.now()
    }

    setAlerts([...alerts, alert])
    setNewSymbol('')
    setNewPrice('')
    setAdding(false)
  }

  const handleRemoveAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  const activeAlerts = alerts.filter(a => !a.triggered)
  const triggeredAlerts = alerts.filter(a => a.triggered)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell size={20} className="text-blue-500" />
          Price Alerts
        </CardTitle>
        <CardDescription>Get notified when prices hit your targets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Alert Form */}
        {!adding ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
            className="w-full"
          >
            <Plus size={16} className="mr-2" />
            Add Price Alert
          </Button>
        ) : (
          <div className="space-y-2 p-3 border border-border rounded-lg">
            <Input
              placeholder="Symbol (e.g., AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Target price"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="text-sm"
              step="0.01"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={newCondition === 'above' ? 'default' : 'outline'}
                onClick={() => setNewCondition('above')}
                className="flex-1"
              >
                <TrendingUp size={14} className="mr-1" />
                Above
              </Button>
              <Button
                size="sm"
                variant={newCondition === 'below' ? 'default' : 'outline'}
                onClick={() => setNewCondition('below')}
                className="flex-1"
              >
                <TrendingDown size={14} className="mr-1" />
                Below
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAlert} className="flex-1">
                Add Alert
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAdding(false)
                  setNewSymbol('')
                  setNewPrice('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Active Alerts</h4>
            {activeAlerts.map((alert) => {
              const currentPrice = currentPrices[alert.symbol]
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{alert.symbol}</p>
                      {alert.condition === 'above' ? (
                        <TrendingUp size={14} className="text-chart-1" />
                      ) : (
                        <TrendingDown size={14} className="text-destructive" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Alert when {alert.condition} ${alert.targetPrice.toFixed(2)}
                    </p>
                    {currentPrice && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: ${currentPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAlert(alert.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BellOff size={16} />
              Triggered Alerts
            </h4>
            {triggeredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 rounded-lg border border-chart-1 bg-chart-1/5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{alert.symbol}</p>
                    <span className="text-xs bg-chart-1 text-white px-2 py-0.5 rounded">
                      Triggered
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {alert.condition} ${alert.targetPrice.toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveAlert(alert.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No price alerts set. Create one to get notified!
          </p>
        )}
      </CardContent>
    </Card>
  )
}
