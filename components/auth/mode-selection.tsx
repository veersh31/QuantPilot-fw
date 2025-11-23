'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, DollarSign, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'
import { TradingMode, UserProfile } from '@/lib/types/user'

interface ModeSelectionProps {
  profile: UserProfile
  onModeSelect: (mode: TradingMode, paperStartingCash?: number) => void
}

export function ModeSelection({ profile, onModeSelect }: ModeSelectionProps) {
  const [selectedMode, setSelectedMode] = useState<TradingMode | null>(null)
  const [paperCash, setPaperCash] = useState('100000')

  const handleContinue = () => {
    if (!selectedMode) {
      alert('Please select a trading mode')
      return
    }

    if (selectedMode === 'paper') {
      const cash = parseFloat(paperCash)
      if (isNaN(cash) || cash <= 0) {
        alert('Please enter a valid starting cash amount')
        return
      }
      onModeSelect('paper', cash)
    } else {
      onModeSelect('real')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">
            Welcome, <span className="text-primary">{profile.username}</span>!
          </h1>
          <p className="text-lg text-muted-foreground">
            Choose your portfolio tracking mode to get started
          </p>
          <div className="max-w-2xl mx-auto mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              📊 QuantPilot is a <strong>portfolio analytics platform</strong> with ML predictions and tax reporting.
              <br />
              ⚠️ This platform does NOT execute trades or connect to brokers - you manage actual trades through your brokerage.
            </p>
          </div>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Paper Trading */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedMode === 'paper'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedMode('paper')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Shield className="text-blue-500" size={32} />
                </div>
                {selectedMode === 'paper' && (
                  <CheckCircle2 className="text-primary" size={24} />
                )}
              </div>
              <CardTitle className="text-2xl mt-4">Paper Trading</CardTitle>
              <CardDescription className="text-base">
                Practice with virtual money, zero risk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Start with virtual cash</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Real market prices</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Test strategies safely</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>No financial risk</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Perfect for beginners</span>
                </div>
              </div>

              {selectedMode === 'paper' && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-medium mb-2 block">
                    Starting Virtual Cash
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign size={20} className="text-muted-foreground" />
                    <Input
                      type="number"
                      value={paperCash}
                      onChange={(e) => setPaperCash(e.target.value)}
                      placeholder="100000"
                      step="1000"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: $10,000 - $100,000 for realistic practice
                  </p>
                </div>
              )}

              <div className="pt-2">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">
                    <AlertCircle size={14} />
                    Recommended for new traders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real Trading Analytics */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedMode === 'real'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedMode('real')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-lg bg-chart-1/10">
                  <TrendingUp className="text-chart-1" size={32} />
                </div>
                {selectedMode === 'real' && (
                  <CheckCircle2 className="text-primary" size={24} />
                )}
              </div>
              <CardTitle className="text-2xl mt-4">Portfolio Analytics</CardTitle>
              <CardDescription className="text-base">
                Track and analyze your real investment portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Track real positions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Transaction history</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Tax reporting (cost basis)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>Portfolio performance metrics</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-chart-1" />
                  <span>AI trading recommendations</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2 mb-2">
                    <AlertCircle size={16} />
                    IMPORTANT: Analytics Only
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Manual transaction entry (after you trade elsewhere)</li>
                    <li>• No broker connections or trade execution</li>
                    <li>• For tracking & analysis only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-muted border border-border">
          <p className="text-sm text-center text-muted-foreground">
            <strong>Note:</strong> You can switch between modes anytime from your profile settings.
            Both modes provide full access to all analytics and tools.
          </p>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={handleContinue}
            size="lg"
            disabled={!selectedMode}
            className="px-12"
          >
            Continue with {selectedMode === 'paper' ? 'Paper Trading' : 'Portfolio Analytics'}
          </Button>
        </div>
      </div>
    </div>
  )
}
