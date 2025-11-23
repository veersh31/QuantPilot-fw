/**
 * Enhanced Export Utilities for Transaction Tracking and Portfolio Management
 */

import { Transaction, Position, PortfolioSummary } from './types/portfolio'

/**
 * Export transactions to CSV
 */
export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const headers = ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Fees', 'Total', 'Notes']

  const rows = transactions.map(t => [
    new Date(t.date).toLocaleDateString(),
    t.symbol,
    t.type.toUpperCase(),
    t.quantity.toString(),
    `$${t.price.toFixed(2)}`,
    `$${t.fees.toFixed(2)}`,
    `$${(t.quantity * t.price + (t.type === 'buy' ? t.fees : -t.fees)).toFixed(2)}`,
    t.notes || ''
  ])

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  downloadCSV(csv, `QuantPilot-Transactions-${new Date().toISOString().split('T')[0]}.csv`)
}

/**
 * Export portfolio statement (comprehensive report)
 */
export function exportPortfolioStatement(
  positions: Position[],
  transactions: Transaction[],
  summary: PortfolioSummary
): void {
  const date = new Date().toLocaleDateString()

  const statementRows = [
    ['QuantPilot Portfolio Statement'],
    [`Generated: ${date}`],
    [''],
    ['Account Summary'],
    ['Total Portfolio Value', `$${summary.totalValue.toFixed(2)}`],
    ['Cash', `$${summary.cash.toFixed(2)}`],
    ['Total Invested (Cost Basis)', `$${summary.totalCostBasis.toFixed(2)}`],
    ['Total Unrealized Gain/Loss', `$${summary.totalUnrealizedGain.toFixed(2)}`],
    ['Unrealized Gain/Loss %', `${summary.totalUnrealizedGainPercent.toFixed(2)}%`],
    ['Total Realized Gain/Loss', `$${summary.totalRealizedGain.toFixed(2)}`],
    ['Total Dividends Received', `$${summary.totalDividends.toFixed(2)}`],
    ['Total Fees Paid', `$${summary.totalFees.toFixed(2)}`],
    ['Number of Positions', summary.numberOfPositions.toString()],
    [''],
    ['Current Holdings'],
    ['Symbol', 'Quantity', 'Avg Cost', 'Current Price', 'Market Value', 'Unrealized Gain', 'Gain %', 'Weight'],
    ...positions.map(p => [
      p.symbol,
      p.quantity.toFixed(4),
      `$${p.avgCost.toFixed(2)}`,
      `$${p.currentPrice.toFixed(2)}`,
      `$${p.marketValue.toFixed(2)}`,
      `$${p.unrealizedGain.toFixed(2)}`,
      `${p.unrealizedGainPercent.toFixed(2)}%`,
      `${((p.marketValue / summary.totalValue) * 100).toFixed(2)}%`
    ]),
    [''],
    ['Recent Transactions (Last 10)'],
    ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Fees', 'Total'],
    ...transactions.slice(0, 10).map(t => [
      new Date(t.date).toLocaleDateString(),
      t.symbol,
      t.type.toUpperCase(),
      t.quantity.toString(),
      `$${t.price.toFixed(2)}`,
      `$${t.fees.toFixed(2)}`,
      `$${(t.quantity * t.price + (t.type === 'buy' ? t.fees : -t.fees)).toFixed(2)}`
    ]),
    [''],
    ['DISCLAIMER'],
    ['This statement is for informational purposes only and does not constitute financial advice.'],
    ['Past performance does not guarantee future results. Trading involves risk of loss.'],
    ['Consult a licensed financial advisor before making investment decisions.']
  ]

  const csv = statementRows.map(row => row.join(',')).join('\n')

  downloadCSV(csv, `QuantPilot-Statement-${new Date().toISOString().split('T')[0]}.csv`)
}

/**
 * Helper function to download CSV
 */
function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export data to JSON (for backup/restore)
 */
export function exportToJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Import data from JSON file
 */
export function importFromJSON(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve(data)
      } catch (error) {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
