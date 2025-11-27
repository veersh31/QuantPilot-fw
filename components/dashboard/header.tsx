'use client'

import { BarChart3, Settings, Moon, Sun, LogOut, User, Shield, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const { profile, isAuthenticated, currentMode, setCurrentMode, logout } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between max-w-[1600px]">
        {/* Logo */}
        <div className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
            <BarChart3 className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              QuantPilot
            </h1>
            <p className="text-xs text-muted-foreground font-medium">AI-Powered Trading Analytics</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {mounted && isAuthenticated && (
            <>
              {/* Mode Switcher - Enhanced */}
              <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50">
                <Button
                  variant={currentMode === 'paper' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentMode('paper')}
                  className={`gap-2 text-xs transition-all duration-200 ${currentMode === 'paper' ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md' : 'hover:bg-muted'}`}
                >
                  <Shield size={14} />
                  Paper Trading
                </Button>
                <Button
                  variant={currentMode === 'real' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentMode('real')}
                  className={`gap-2 text-xs transition-all duration-200 ${currentMode === 'real' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md' : 'hover:bg-muted'}`}
                >
                  <TrendingUp size={14} />
                  Real Portfolio
                </Button>
              </div>

              {/* Theme Toggle - Enhanced */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-xl hover:bg-muted/50 hover:scale-105 transition-all duration-200"
              >
                {theme === 'dark' ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-blue-500" />}
              </Button>

              {/* Profile - Enhanced */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 backdrop-blur-sm border border-border/50 hover:bg-muted transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="text-sm font-semibold hidden sm:inline">{profile?.username}</span>
              </div>

              {/* Logout - Enhanced */}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Logout"
                className="rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:scale-105 transition-all duration-200"
              >
                <LogOut size={20} />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
