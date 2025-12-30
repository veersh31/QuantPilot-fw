'use client'

import { BarChart3, Moon, Sun, Shield, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { UserNav } from '@/components/auth/user-nav'

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, currentMode, setCurrentMode } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
            <BarChart3 className="text-primary-foreground" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">QuantPilot</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mounted && isAuthenticated && (
            <>
              {/* Mode Switcher */}
              <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-muted">
                <Button
                  variant={currentMode === 'paper' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentMode('paper')}
                  className="gap-2 text-xs"
                >
                  <Shield size={14} />
                  Paper Trading
                </Button>
                <Button
                  variant={currentMode === 'real' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentMode('real')}
                  className="gap-2 text-xs"
                >
                  <TrendingUp size={14} />
                  Real Portfolio
                </Button>
              </div>

              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>

              {/* User Profile Navigation */}
              <UserNav />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
