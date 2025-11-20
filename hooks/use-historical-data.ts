import { useState, useEffect } from 'react'

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

export function useHistoricalData(symbol: string | null, days: number = 60) {
  const [data, setData] = useState<HistoricalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!symbol) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/stocks/historical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, days }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch historical data')
        }

        const historicalData = await response.json()
        setData(historicalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error fetching historical data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistoricalData()
  }, [symbol, days])

  return { data, loading, error }
}
