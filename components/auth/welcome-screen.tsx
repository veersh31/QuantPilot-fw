'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, BarChart3, Shield, Zap } from 'lucide-react'
import { UserProfile } from '@/lib/types/user'

interface WelcomeScreenProps {
  onComplete: (profile: UserProfile) => void
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState<'welcome' | 'signup'>('welcome')
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  })

  const handleGetStarted = () => {
    setStep('signup')
  }

  const handleCreateAccount = () => {
    if (!formData.username || !formData.email) {
      alert('Please fill in all fields')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address (e.g., user@example.com)')
      return
    }

    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      username: formData.username,
      email: formData.email,
      tradingMode: 'paper', // Default to paper trading
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: {
        defaultMode: 'paper',
        theme: 'system',
        notifications: true
      }
    }

    onComplete(profile)
  }

  if (step === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp size={32} className="text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              Start your trading journey with QuantPilot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Username</label>
              <Input
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleCreateAccount} className="w-full" size="lg">
                Create Account
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By creating an account, you agree to our terms of service and privacy policy.
              Data is stored locally on your device.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <TrendingUp size={48} className="text-primary" />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to <span className="text-primary">QuantPilot</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent trading companion with AI-powered insights,
            real-time analytics, and risk-free paper trading.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-chart-1/10 w-fit mb-2">
                <BarChart3 className="text-chart-1" size={24} />
              </div>
              <CardTitle className="text-lg">Real-Time Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Industry-standard technical indicators including RSI, MACD, Bollinger Bands,
                and more with real market data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-2">
                <Shield className="text-blue-500" size={24} />
              </div>
              <CardTitle className="text-lg">Paper Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Practice trading strategies with virtual money using real market prices.
                Zero risk, maximum learning.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-2">
                <Zap className="text-purple-500" size={24} />
              </div>
              <CardTitle className="text-lg">AI Trading Advisor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get intelligent recommendations powered by advanced AI analyzing
                technical indicators and market conditions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button onClick={handleGetStarted} size="lg" className="px-8">
            Get Started Free
          </Button>
          <p className="text-sm text-muted-foreground">
            No credit card required • All data stored locally • Free forever
          </p>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-center text-muted-foreground">
            <strong className="text-destructive">Risk Warning:</strong> Trading involves substantial risk of loss.
            This platform is for educational purposes only and does not constitute financial advice.
            Always conduct your own research.
          </p>
        </div>
      </div>
    </div>
  )
}
