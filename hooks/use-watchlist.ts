import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type WatchlistItem = Database['public']['Tables']['watchlists']['Row']

export function useWatchlist() {
  const supabase = createClient()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setWatchlist([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setWatchlist(data || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching watchlist:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const addToWatchlist = useCallback(async (
    symbol: string,
    notes?: string,
    targetPrice?: number
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          notes,
          target_price: targetPrice,
        })
        .select()
        .single()

      if (error) throw error

      await fetchWatchlist()
      return data
    } catch (err: any) {
      console.error('Error adding to watchlist:', err)
      throw err
    }
  }, [supabase, fetchWatchlist])

  const removeFromWatchlist = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchWatchlist()
    } catch (err: any) {
      console.error('Error removing from watchlist:', err)
      throw err
    }
  }, [supabase, fetchWatchlist])

  const updateWatchlistItem = useCallback(async (
    id: string,
    updates: {
      notes?: string
      target_price?: number
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      await fetchWatchlist()
      return data
    } catch (err: any) {
      console.error('Error updating watchlist item:', err)
      throw err
    }
  }, [supabase, fetchWatchlist])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  return {
    watchlist,
    loading,
    error,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistItem,
    refreshWatchlist: fetchWatchlist,
  }
}
