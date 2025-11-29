import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'

interface Fundamentals {
  peRatio: number | null
  psRatio: number | null
  pbRatio: number | null
  eps: number | null
  roe: number | null
  roic: number | null
  operatingMargin: number | null
  profitMargin: number | null
  debtToEquity: number | null
  currentRatio: number | null
  quickRatio: number | null
  revenueGrowth: number | null
  dividendYield: number | null
  payoutRatio: number | null
  marketCap: number | null
  bookValue: number | null
  beta: number | null
  week52High: number | null
  week52Low: number | null
  name: string
  sector: string
  industry: string
  description: string
}

export function useFundamentals(symbol: string | null) {
  const { data, error, isLoading } = useSWR(
    symbol ? `/stocks/fundamentals?symbol=${symbol}` : null,
    async () => {
      console.log('[v0] Fetching fundamentals for:', symbol)
      const data = await apiClient.get<Fundamentals>('/stocks/fundamentals', { symbol: symbol! })
      console.log('[v0] Fundamentals loaded successfully')
      return data as Fundamentals
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  return { fundamentals: data, isLoading, error: !!error }
}
