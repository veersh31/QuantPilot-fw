import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Portfolio = Database['public']['Tables']['portfolios']['Row']
type PortfolioHolding = Database['public']['Tables']['portfolio_holdings']['Row']

interface HoldingWithPrice extends PortfolioHolding {
  current_price?: number
  total_value?: number
  gain_loss?: number
  gain_loss_percentage?: number
}

export function usePortfolio() {
  const supabase = createClient()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's default portfolio
  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setPortfolio(null)
        setHoldings([])
        setLoading(false)
        return
      }

      // Get default portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (portfolioError) throw portfolioError

      setPortfolio(portfolioData)

      // Get holdings for this portfolio
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolioData.id)
        .order('created_at', { ascending: false })

      if (holdingsError) throw holdingsError

      setHoldings(holdingsData || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching portfolio:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Add a stock to portfolio
  const addHolding = useCallback(async (
    symbol: string,
    quantity: number,
    averagePrice: number,
    notes?: string
  ) => {
    try {
      if (!portfolio) throw new Error('No portfolio found')

      const { data, error } = await supabase
        .from('portfolio_holdings')
        .insert({
          portfolio_id: portfolio.id,
          symbol: symbol.toUpperCase(),
          quantity,
          average_price: averagePrice,
          notes,
        })
        .select()
        .single()

      if (error) throw error

      // Refresh holdings
      await fetchPortfolio()
      return data
    } catch (err: any) {
      console.error('Error adding holding:', err)
      throw err
    }
  }, [portfolio, supabase, fetchPortfolio])

  // Update a holding
  const updateHolding = useCallback(async (
    holdingId: string,
    updates: {
      quantity?: number
      average_price?: number
      notes?: string
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .update(updates)
        .eq('id', holdingId)
        .select()
        .single()

      if (error) throw error

      // Refresh holdings
      await fetchPortfolio()
      return data
    } catch (err: any) {
      console.error('Error updating holding:', err)
      throw err
    }
  }, [supabase, fetchPortfolio])

  // Remove a holding
  const removeHolding = useCallback(async (holdingId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', holdingId)

      if (error) throw error

      // Refresh holdings
      await fetchPortfolio()
    } catch (err: any) {
      console.error('Error removing holding:', err)
      throw err
    }
  }, [supabase, fetchPortfolio])

  // Load portfolio on mount
  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  return {
    portfolio,
    holdings,
    loading,
    error,
    addHolding,
    updateHolding,
    removeHolding,
    refreshPortfolio: fetchPortfolio,
  }
}
