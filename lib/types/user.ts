/**
 * User Types and Authentication
 */

export type TradingMode = 'paper' | 'real'

export interface UserProfile {
  id: string
  username: string
  email: string
  tradingMode: TradingMode
  createdAt: string
  lastLogin: string
  preferences: {
    defaultMode: TradingMode
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
  }
}

export interface UserSession {
  isAuthenticated: boolean
  profile: UserProfile | null
  currentMode: TradingMode
}
