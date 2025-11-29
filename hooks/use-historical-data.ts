import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'

export interface HistoricalDataPoint {
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
}

export interface HistoricalData {
  symbol: string
  data: HistoricalDataPoint[]
}

export type TimeframeOption = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX'

/**
 * Convert timeframe string to number of days
 */
export function timeframeToDays(timeframe: TimeframeOption): number {
  const mapping: Record<TimeframeOption, number> = {
    '1D': 1,
    '5D': 5,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
    '5Y': 1825,
    'MAX': 3650 // 10 years
  }
  return mapping[timeframe]
}

/**
 * Hook to fetch historical stock data with flexible timeframe support
 * @param symbol Stock symbol (e.g., 'AAPL')
 * @param timeframe Timeframe option ('1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX') or custom days
 */
export function useHistoricalData(
  symbol: string | null,
  timeframe: TimeframeOption | number = '1M'
) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!symbol) return

      setLoading(true)
      setError(null)

      try {
        // Convert timeframe to days if it's a string
        const days = typeof timeframe === 'string'
          ? timeframeToDays(timeframe)
          : timeframe

        const historicalData = await apiClient.post<HistoricalData>('/stocks/historical', { symbol, days })
        setData(historicalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching historical data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, timeframe])

  return { data, loading, error }
}
