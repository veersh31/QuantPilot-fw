/**
 * Portfolio and Transaction Types
 * Professional-grade portfolio management with full transaction history
 */

export type TransactionType = 'buy' | 'sell' | 'dividend' | 'split' | 'fee'

export interface Transaction {
  id: string
  symbol: string
  type: TransactionType
  quantity: number
  price: number
  date: string // ISO 8601 format
  fees: number
  notes?: string
  createdAt: string
}

export interface Position {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  costBasis: number
  unrealizedGain: number
  unrealizedGainPercent: number
  realizedGain: number // From closed positions
  dividendsReceived: number
  firstPurchaseDate: string
  lastUpdated: string
}

export interface TaxLot {
  id: string
  symbol: string
  quantity: number
  purchasePrice: number
  purchaseDate: string
  transactionId: string
}

export interface ClosedPosition {
  symbol: string
  openDate: string
  closeDate: string
  quantity: number
  buyPrice: number
  sellPrice: number
  realizedGain: number
  realizedGainPercent: number
  holdingPeriod: number // days
  fees: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalUnrealizedGain: number
  totalUnrealizedGainPercent: number
  totalRealizedGain: number
  totalDividends: number
  totalFees: number
  numberOfPositions: number
  cash: number
  timestamp: string
}

export interface TaxReport {
  year: number
  shortTermGains: number // Held < 1 year
  longTermGains: number // Held >= 1 year
  dividendIncome: number
  totalGains: number
  positions: ClosedPosition[]
  generatedAt: string
}

export interface PaperTradingAccount {
  accountId: string
  name: string
  startingCash: number
  currentCash: number
  positions: Position[]
  transactions: Transaction[]
  summary: PortfolioSummary
  createdAt: string
  isActive: boolean
}

/**
 * Calculate position details from transactions
 */
export function calculatePosition(
  symbol: string,
  transactions: Transaction[],
  currentPrice: number
): Position | null {
  const symbolTxns = transactions.filter(t => t.symbol === symbol)
  if (symbolTxns.length === 0) return null

  let totalQuantity = 0
  let totalCost = 0
  let realizedGain = 0
  let dividendsReceived = 0
  let firstPurchaseDate = ''

  // FIFO tracking for tax lots
  const taxLots: TaxLot[] = []

  for (const txn of symbolTxns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
    switch (txn.type) {
      case 'buy':
        totalQuantity += txn.quantity
        totalCost += (txn.quantity * txn.price) + txn.fees
        if (!firstPurchaseDate) {
          firstPurchaseDate = txn.date
        }
        // Add tax lot
        taxLots.push({
          id: `${txn.id}-lot`,
          symbol: txn.symbol,
          quantity: txn.quantity,
          purchasePrice: txn.price,
          purchaseDate: txn.date,
          transactionId: txn.id
        })
        break

      case 'sell':
        let remainingSell = txn.quantity
        // Sell from oldest lots first (FIFO)
        for (let i = 0; i < taxLots.length && remainingSell > 0; i++) {
          const lot = taxLots[i]
          const sellQty = Math.min(lot.quantity, remainingSell)

          // Calculate realized gain
          const costBasis = sellQty * lot.purchasePrice
          const proceeds = sellQty * txn.price
          realizedGain += (proceeds - costBasis - txn.fees)

          lot.quantity -= sellQty
          remainingSell -= sellQty
          totalQuantity -= sellQty
        }
        // Remove empty lots
        taxLots.splice(0, taxLots.filter(l => l.quantity <= 0).length)
        break

      case 'dividend':
        dividendsReceived += txn.price // Price field stores dividend amount
        break

      case 'split':
        // Adjust all existing lots
        const splitRatio = txn.price // Price field stores split ratio
        totalQuantity *= splitRatio
        taxLots.forEach(lot => {
          lot.quantity *= splitRatio
          lot.purchasePrice /= splitRatio
        })
        break

      case 'fee':
        totalCost += txn.price
        break
    }
  }

  if (totalQuantity === 0) return null

  const avgCost = totalCost / totalQuantity
  const marketValue = totalQuantity * currentPrice
  const costBasis = totalQuantity * avgCost
  const unrealizedGain = marketValue - costBasis
  const unrealizedGainPercent = (unrealizedGain / costBasis) * 100

  return {
    symbol,
    quantity: totalQuantity,
    avgCost,
    currentPrice,
    marketValue,
    costBasis,
    unrealizedGain,
    unrealizedGainPercent,
    realizedGain,
    dividendsReceived,
    firstPurchaseDate,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Calculate portfolio summary
 */
export function calculatePortfolioSummary(
  positions: Position[],
  cash: number,
  allTransactions: Transaction[]
): PortfolioSummary {
  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0) + cash
  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0)
  const totalUnrealizedGain = positions.reduce((sum, p) => sum + p.unrealizedGain, 0)
  const totalRealizedGain = positions.reduce((sum, p) => sum + p.realizedGain, 0)
  const totalDividends = positions.reduce((sum, p) => sum + p.dividendsReceived, 0)
  const totalFees = allTransactions
    .filter(t => t.type !== 'dividend')
    .reduce((sum, t) => sum + t.fees, 0)
  const totalUnrealizedGainPercent = totalCostBasis > 0
    ? (totalUnrealizedGain / totalCostBasis) * 100
    : 0

  return {
    totalValue,
    totalCostBasis,
    totalUnrealizedGain,
    totalUnrealizedGainPercent,
    totalRealizedGain,
    totalDividends,
    totalFees,
    numberOfPositions: positions.length,
    cash,
    timestamp: new Date().toISOString()
  }
}

/**
 * Generate tax report for a given year
 */
export function generateTaxReport(
  transactions: Transaction[],
  year: number
): TaxReport {
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)

  let shortTermGains = 0
  let longTermGains = 0
  let dividendIncome = 0
  const closedPositions: ClosedPosition[] = []

  // Group transactions by symbol
  const symbolGroups = new Map<string, Transaction[]>()
  transactions.forEach(t => {
    if (!symbolGroups.has(t.symbol)) {
      symbolGroups.set(t.symbol, [])
    }
    symbolGroups.get(t.symbol)!.push(t)
  })

  // Process each symbol
  symbolGroups.forEach((txns, symbol) => {
    const sortedTxns = txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const taxLots: (TaxLot & { fees: number })[] = []

    for (const txn of sortedTxns) {
      const txnDate = new Date(txn.date)

      if (txn.type === 'buy') {
        taxLots.push({
          id: `${txn.id}-lot`,
          symbol: txn.symbol,
          quantity: txn.quantity,
          purchasePrice: txn.price,
          purchaseDate: txn.date,
          transactionId: txn.id,
          fees: txn.fees
        })
      } else if (txn.type === 'sell' && txnDate >= yearStart && txnDate <= yearEnd) {
        let remainingSell = txn.quantity

        for (let i = 0; i < taxLots.length && remainingSell > 0; i++) {
          const lot = taxLots[i]
          const sellQty = Math.min(lot.quantity, remainingSell)

          const costBasis = (sellQty * lot.purchasePrice) + (lot.fees * (sellQty / lot.quantity))
          const proceeds = (sellQty * txn.price) - (txn.fees * (sellQty / txn.quantity))
          const gain = proceeds - costBasis

          const purchaseDate = new Date(lot.purchaseDate)
          const holdingPeriod = Math.floor((txnDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

          // Classify as short-term (<= 365 days) or long-term (> 365 days)
          if (holdingPeriod <= 365) {
            shortTermGains += gain
          } else {
            longTermGains += gain
          }

          closedPositions.push({
            symbol,
            openDate: lot.purchaseDate,
            closeDate: txn.date,
            quantity: sellQty,
            buyPrice: lot.purchasePrice,
            sellPrice: txn.price,
            realizedGain: gain,
            realizedGainPercent: (gain / costBasis) * 100,
            holdingPeriod,
            fees: (lot.fees * (sellQty / lot.quantity)) + (txn.fees * (sellQty / txn.quantity))
          })

          lot.quantity -= sellQty
          remainingSell -= sellQty
        }
      } else if (txn.type === 'dividend' && txnDate >= yearStart && txnDate <= yearEnd) {
        dividendIncome += txn.price
      }
    }
  })

  return {
    year,
    shortTermGains,
    longTermGains,
    dividendIncome,
    totalGains: shortTermGains + longTermGains,
    positions: closedPositions.sort((a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()),
    generatedAt: new Date().toISOString()
  }
}
