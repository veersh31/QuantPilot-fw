'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'

interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  signup: (email: string, password: string, name: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Authentication Provider (Demo Implementation)
 *
 * This is a basic authentication scaffolding for demonstration purposes.
 * In production, you should integrate with a real authentication service:
 * - NextAuth.js (https://next-auth.js.org/)
 * - Clerk (https://clerk.com/)
 * - Supabase Auth (https://supabase.com/docs/guides/auth)
 * - Auth0 (https://auth0.com/)
 * - Firebase Auth (https://firebase.google.com/docs/auth)
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('quantpilot-user', null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate checking auth status
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Demo implementation - always succeeds
      // In production, call your auth API:
      // const response = await fetch('/api/auth/login', { ... })

      const demoUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      }

      setUser(demoUser)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
  }

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      // Demo implementation - always succeeds
      // In production, call your auth API:
      // const response = await fetch('/api/auth/signup', { ... })

      const demoUser: User = {
        id: Date.now().toString(),
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      }

      setUser(demoUser)
      return true
    } catch (error) {
      console.error('Signup error:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
