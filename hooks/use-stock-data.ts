import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

export interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  high52w: number
  low52w: number
  marketCap: string
  pe: number
  dividendYield: number
  volume: number
  avgVolume: number
  timestamp?: string
  quoteType?: string
  isETF?: boolean
}

export function useStockData(symbol: string | null) {
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStockData = useCallback(async () => {
    if (!symbol) return

    setLoading(true)
    setError(null)

    try {
      const stockData = await apiClient.post<StockData>('/stocks/quote', { symbol })
      setData(stockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchStockData()
    const interval = setInterval(fetchStockData, 60000) // Update every 60 seconds (1 min)

    return () => clearInterval(interval)
  }, [fetchStockData])

  return { data, loading, error, refetch: fetchStockData }
}
