/**
 * User Types and Authentication
 */

export interface UserProfile {
  id: string
  username: string
  email: string
  createdAt: string
  lastLogin: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
  }
}

export interface UserSession {
  isAuthenticated: boolean
  profile: UserProfile | null
}
