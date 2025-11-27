/**
 * Predefined stock universes for screening
 * Real-world screeners scan through thousands of stocks automatically
 */

// Popular S&P 500 stocks (top holdings by market cap)
export const SP500_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'JNJ',
  'JPM', 'V', 'XOM', 'WMT', 'PG', 'MA', 'HD', 'CVX', 'MRK', 'ABBV',
  'PEP', 'COST', 'AVGO', 'KO', 'LLY', 'PFE', 'TMO', 'MCD', 'CSCO', 'ABT',
  'ACN', 'DHR', 'ADBE', 'WFC', 'NKE', 'VZ', 'NFLX', 'CRM', 'TXN', 'PM',
  'INTC', 'NEE', 'UPS', 'AMD', 'UNP', 'LOW', 'HON', 'RTX', 'QCOM', 'BMY',
  'ORCL', 'IBM', 'AMAT', 'SBUX', 'CAT', 'BA', 'GE', 'DE', 'AXP', 'GS',
  'MS', 'BLK', 'SCHW', 'ADP', 'GILD', 'MMM', 'MDLZ', 'ISRG', 'LMT', 'CVS',
  'ADI', 'TJX', 'AMT', 'TMUS', 'CI', 'VRTX', 'MO', 'ZTS', 'PLD', 'SYK',
  'NOW', 'REGN', 'DUK', 'SO', 'BDX', 'CB', 'PYPL', 'CL', 'EL', 'MMC',
  'BSX', 'USB', 'APD', 'SHW', 'ITW', 'AON', 'PNC', 'HUM', 'CCI', 'CME'
]

// Tech-focused stocks
export const TECH_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN',
  'ADBE', 'CRM', 'ORCL', 'IBM', 'NOW', 'SNOW', 'PLTR', 'CRWD', 'PANW', 'ZS',
  'NET', 'DDOG', 'MDB', 'TEAM', 'WDAY', 'OKTA', 'TWLO', 'ZM', 'DOCU', 'SHOP'
]

// High dividend stocks
export const DIVIDEND_STOCKS = [
  'JNJ', 'PG', 'KO', 'PEP', 'MCD', 'WMT', 'XOM', 'CVX', 'VZ', 'T',
  'PM', 'MO', 'SO', 'DUK', 'NEE', 'IBM', 'MMM', 'CAT', 'DE', 'LMT',
  'RTX', 'BA', 'GE', 'GS', 'JPM', 'C', 'BAC', 'WFC', 'USB', 'PNC'
]

// Popular growth stocks
export const GROWTH_STOCKS = [
  'TSLA', 'NVDA', 'AMD', 'NFLX', 'META', 'GOOGL', 'AMZN', 'SHOP', 'SQ', 'PYPL',
  'ROKU', 'SNAP', 'UBER', 'LYFT', 'ABNB', 'COIN', 'RBLX', 'U', 'PATH', 'DKNG',
  'PLTR', 'SNOW', 'CRWD', 'PANW', 'ZS', 'NET', 'DDOG', 'MDB', 'NOW', 'CRM'
]

// Value stocks
export const VALUE_STOCKS = [
  'BRK.B', 'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'SCHW',
  'XOM', 'CVX', 'COP', 'SLB', 'MPC', 'VLO', 'KMI', 'WMB', 'OKE', 'ET',
  'F', 'GM', 'BA', 'GE', 'CAT', 'DE', 'MMM', 'HON', 'RTX', 'LMT'
]

// Healthcare stocks
export const HEALTHCARE_STOCKS = [
  'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'MRK', 'ABT', 'DHR', 'BMY', 'LLY',
  'AMGN', 'GILD', 'CVS', 'CI', 'HUM', 'VRTX', 'REGN', 'ISRG', 'ZTS', 'SYK',
  'BSX', 'BDX', 'EW', 'IDXX', 'IQV', 'RMD', 'ALGN', 'DXCM', 'ILMN', 'MRNA'
]

// Financial stocks
export const FINANCIAL_STOCKS = [
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'USB', 'PNC', 'SCHW', 'BLK',
  'AXP', 'V', 'MA', 'PYPL', 'SQ', 'COIN', 'SOFI', 'HOOD', 'AFRM', 'UPST',
  'BX', 'KKR', 'APO', 'ARES', 'CG', 'SPG', 'PLD', 'AMT', 'CCI', 'SBAC'
]

export const STOCK_UNIVERSES = {
  'S&P 500 Top 100': SP500_STOCKS,
  'Tech Leaders': TECH_STOCKS,
  'Dividend Stocks': DIVIDEND_STOCKS,
  'Growth Stocks': GROWTH_STOCKS,
  'Value Stocks': VALUE_STOCKS,
  'Healthcare': HEALTHCARE_STOCKS,
  'Financials': FINANCIAL_STOCKS,
} as const

export type StockUniverse = keyof typeof STOCK_UNIVERSES

// Preset filter configurations
export interface ScreenerPreset {
  name: string
  description: string
  filters: {
    minMarketCap: number
    maxMarketCap: number
    minPE: number
    maxPE: number
    minDividendYield: number
    maxDividendYield: number
    minPrice: number
    maxPrice: number
  }
  universe: StockUniverse
}

export const SCREENER_PRESETS: ScreenerPreset[] = [
  {
    name: 'High Growth Tech',
    description: 'Fast-growing tech companies with strong momentum',
    filters: {
      minMarketCap: 10,
      maxMarketCap: 10000,
      minPE: 20,
      maxPE: 100,
      minDividendYield: 0,
      maxDividendYield: 2,
      minPrice: 50,
      maxPrice: 1000
    },
    universe: 'Tech Leaders'
  },
  {
    name: 'Dividend Champions',
    description: 'Reliable dividend payers with yields over 3%',
    filters: {
      minMarketCap: 10,
      maxMarketCap: 10000,
      minPE: 5,
      maxPE: 25,
      minDividendYield: 3,
      maxDividendYield: 10,
      minPrice: 20,
      maxPrice: 500
    },
    universe: 'Dividend Stocks'
  },
  {
    name: 'Value Plays',
    description: 'Undervalued companies with low P/E ratios',
    filters: {
      minMarketCap: 5,
      maxMarketCap: 500,
      minPE: 5,
      maxPE: 15,
      minDividendYield: 0,
      maxDividendYield: 10,
      minPrice: 10,
      maxPrice: 200
    },
    universe: 'Value Stocks'
  },
  {
    name: 'Blue Chip Giants',
    description: 'Large-cap established companies',
    filters: {
      minMarketCap: 100,
      maxMarketCap: 10000,
      minPE: 10,
      maxPE: 35,
      minDividendYield: 0,
      maxDividendYield: 10,
      minPrice: 50,
      maxPrice: 1000
    },
    universe: 'S&P 500 Top 100'
  },
  {
    name: 'Affordable Growth',
    description: 'Growth stocks under $100 per share',
    filters: {
      minMarketCap: 1,
      maxMarketCap: 1000,
      minPE: 15,
      maxPE: 100,
      minDividendYield: 0,
      maxDividendYield: 3,
      minPrice: 10,
      maxPrice: 100
    },
    universe: 'Growth Stocks'
  }
]
