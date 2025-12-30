export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_holdings: {
        Row: {
          id: string
          portfolio_id: string
          symbol: string
          quantity: number
          average_price: number
          purchase_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          portfolio_id: string
          symbol: string
          quantity: number
          average_price: number
          purchase_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          portfolio_id?: string
          symbol?: string
          quantity?: number
          average_price?: number
          purchase_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          symbol: string
          notes: string | null
          target_price: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          notes?: string | null
          target_price?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          notes?: string | null
          target_price?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      trading_alerts: {
        Row: {
          id: string
          user_id: string
          symbol: string
          alert_type: 'price_above' | 'price_below' | 'rsi_oversold' | 'rsi_overbought'
          target_value: number
          is_active: boolean
          triggered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          alert_type: 'price_above' | 'price_below' | 'rsi_oversold' | 'rsi_overbought'
          target_value: number
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          alert_type?: 'price_above' | 'price_below' | 'rsi_oversold' | 'rsi_overbought'
          target_value?: number
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
