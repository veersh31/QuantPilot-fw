'use client'

import { BarChart3, Settings, Moon, Sun, LogIn, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthDialog } from '@/components/auth/auth-dialog'

export function DashboardHeader() {
  const { theme, setTheme } = useTheme()
  const { user, isAuthenticated, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)

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

        <div className="flex items-center gap-2">
          {mounted && (
            <>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>

              {isAuthenticated ? (
                <>
                  <Button variant="ghost" size="icon" title={user?.name}>
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                    <LogOut size={20} />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuthDialog(true)}
                  className="gap-2"
                >
                  <LogIn size={16} />
                  Sign In
                </Button>
              )}

              <Button variant="ghost" size="icon">
                <Settings size={20} />
              </Button>
            </>
          )}
        </div>
      </div>

      {showAuthDialog && <AuthDialog onClose={() => setShowAuthDialog(false)} />}
    </header>
  )
}
