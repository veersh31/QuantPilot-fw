import { z } from 'zod'

// Stock validation schema
export const stockSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters'),
  name: z.string().min(1),
  price: z.number().positive('Price must be positive'),
  change: z.number(),
  changePercent: z.number(),
})

// Portfolio stock schema
export const portfolioStockSchema = stockSchema.extend({
  quantity: z.number().positive('Quantity must be positive'),
  avgCost: z.number().positive('Average cost must be positive'),
})

// Watchlist stock schema
export const watchlistStockSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters'),
  name: z.string().min(1),
  price: z.number().positive().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
})

// Price alert schema
export const priceAlertSchema = z.object({
  id: z.string(),
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Symbol must be uppercase letters'),
  targetPrice: z.number().positive('Target price must be positive'),
  condition: z.enum(['above', 'below']),
  triggered: z.boolean(),
  createdAt: z.number(),
})

// API request schemas
export const stockQuoteRequestSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Invalid stock symbol'),
})

export const historicalDataRequestSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Invalid stock symbol'),
  days: z.number().int().positive().max(365).optional().default(30),
})

export const fundamentalsRequestSchema = z.object({
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/, 'Invalid stock symbol'),
})

// User input validation
export const addStockInputSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z]+$/.test(val), 'Symbol must contain only letters'),
  quantity: z.number()
    .positive('Quantity must be positive')
    .or(z.string().transform(val => parseFloat(val))),
  avgCost: z.number()
    .positive('Average cost must be positive')
    .or(z.string().transform(val => parseFloat(val))),
})

export const priceAlertInputSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z]+$/.test(val), 'Symbol must contain only letters'),
  targetPrice: z.number()
    .positive('Target price must be positive')
    .or(z.string().transform(val => parseFloat(val))),
  condition: z.enum(['above', 'below']),
})

// Type exports
export type Stock = z.infer<typeof stockSchema>
export type PortfolioStock = z.infer<typeof portfolioStockSchema>
export type WatchlistStock = z.infer<typeof watchlistStockSchema>
export type PriceAlert = z.infer<typeof priceAlertSchema>
export type StockQuoteRequest = z.infer<typeof stockQuoteRequestSchema>
export type HistoricalDataRequest = z.infer<typeof historicalDataRequestSchema>
export type FundamentalsRequest = z.infer<typeof fundamentalsRequestSchema>
