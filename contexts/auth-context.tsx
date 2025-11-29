'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { UserProfile } from '@/lib/types/user'

interface AuthContextType {
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  hasCompletedOnboarding: boolean
  setProfile: (profile: UserProfile) => void
  completeOnboarding: () => void
  logout: () => void
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
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('quantpilot-profile', null)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage<boolean>('quantpilot-onboarding', false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [profile])

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true)
  }

  const logout = () => {
    setProfile(null)
    setHasCompletedOnboarding(false)
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        isAuthenticated: !!profile && hasCompletedOnboarding,
        isLoading,
        hasCompletedOnboarding,
        setProfile,
        completeOnboarding,
        logout,
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
