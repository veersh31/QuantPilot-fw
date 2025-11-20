'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface StockPrice {
  price: number
  change: number
  changePercent: number
  timestamp: number
}

interface StockDataContextType {
  priceCache: { [symbol: string]: StockPrice }
  fetchPrice: (symbol: string) => Promise<StockPrice | null>
  invalidateCache: (symbol: string) => void
}

const StockDataContext = createContext<StockDataContextType | undefined>(undefined)

const CACHE_DURATION = 60000 // 1 minute

export function StockDataProvider({ children }: { children: React.ReactNode }) {
  const [priceCache, setPriceCache] = useState<{ [symbol: string]: StockPrice }>({})

  const fetchPrice = useCallback(async (symbol: string): Promise<StockPrice | null> => {
    // Check if we have cached data
    const cached = priceCache[symbol]
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached
    }

    try {
      const response = await fetch('/api/stocks/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })

      if (!response.ok) return null

      const data = await response.json()
      const priceData: StockPrice = {
        price: data.price,
        change: data.change,
        changePercent: parseFloat(data.changePercent),
        timestamp: Date.now(),
      }

      setPriceCache(prev => ({ ...prev, [symbol]: priceData }))
      return priceData
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return null
    }
  }, [priceCache])

  const invalidateCache = useCallback((symbol: string) => {
    setPriceCache(prev => {
      const newCache = { ...prev }
      delete newCache[symbol]
      return newCache
    })
  }, [])

  return (
    <StockDataContext.Provider value={{ priceCache, fetchPrice, invalidateCache }}>
      {children}
    </StockDataContext.Provider>
  )
}

export function useStockDataContext() {
  const context = useContext(StockDataContext)
  if (!context) {
    throw new Error('useStockDataContext must be used within a StockDataProvider')
  }
  return context
}
