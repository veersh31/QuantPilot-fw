'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { Transaction, generateTaxReport, TaxReport } from '@/lib/types/portfolio'
import { useLocalStorage } from '@/hooks/use-local-storage'

export function TaxReportComponent() {
  const [transactions] = useLocalStorage<Transaction[]>('quantpilot-transactions', [])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null)

  useEffect(() => {
    if (transactions.length > 0) {
      const report = generateTaxReport(transactions, selectedYear)
      setTaxReport(report)
    }
  }, [transactions, selectedYear])

  const availableYears = Array.from(
    new Set(
      transactions
        .map(t => new Date(t.date).getFullYear())
        .filter(year => year <= new Date().getFullYear())
    )
  ).sort((a, b) => b - a)

  const handleExport = () => {
    if (!taxReport) return

    const csv = [
      ['QuantPilot Tax Report', selectedYear],
      [],
      ['Summary'],
      ['Short-Term Capital Gains (≤365 days)', `$${taxReport.shortTermGains.toFixed(2)}`],
      ['Long-Term Capital Gains (>365 days)', `$${taxReport.longTermGains.toFixed(2)}`],
      ['Total Capital Gains', `$${taxReport.totalGains.toFixed(2)}`],
      ['Dividend Income', `$${taxReport.dividendIncome.toFixed(2)}`],
      [],
      ['Transactions'],
      ['Symbol', 'Open Date', 'Close Date', 'Quantity', 'Buy Price', 'Sell Price', 'Holding Period (days)', 'Gain/Loss', 'Fees', 'Type'],
      ...taxReport.positions.map(p => [
        p.symbol,
        new Date(p.openDate).toLocaleDateString(),
        new Date(p.closeDate).toLocaleDateString(),
        p.quantity.toString(),
        `$${p.buyPrice.toFixed(2)}`,
        `$${p.sellPrice.toFixed(2)}`,
        p.holdingPeriod.toString(),
        `$${p.realizedGain.toFixed(2)}`,
        `$${p.fees.toFixed(2)}`,
        p.holdingPeriod <= 365 ? 'Short-Term' : 'Long-Term'
      ])
    ]

    const csvContent = csv.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `QuantPilot-Tax-Report-${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} />
            Tax Report
          </CardTitle>
          <CardDescription>Capital gains and dividend income for tax filing</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions found. Add transactions to generate tax reports.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            Tax Report
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button size="sm" onClick={handleExport} variant="outline">
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Capital gains and dividend income for tax filing (estimates only - consult a tax professional)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {taxReport && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Short-Term Gains</p>
                </div>
                <p className={`text-xl font-bold ${taxReport.shortTermGains >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  ${taxReport.shortTermGains.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Held ≤ 365 days</p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Long-Term Gains</p>
                </div>
                <p className={`text-xl font-bold ${taxReport.longTermGains >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  ${taxReport.longTermGains.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Held &gt; 365 days</p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total Capital Gains</p>
                </div>
                <p className={`text-xl font-bold ${taxReport.totalGains >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                  ${taxReport.totalGains.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All realized gains</p>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Dividend Income</p>
                </div>
                <p className="text-xl font-bold text-blue-500">
                  ${taxReport.dividendIncome.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Taxable dividends</p>
              </div>
            </div>

            {/* Tax Implications */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-sm font-semibold mb-2">Tax Implications</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>Short-Term Gains:</strong> Taxed as ordinary income at your marginal tax rate (10%-37%)
                </p>
                <p>
                  <strong>Long-Term Gains:</strong> Taxed at preferential rates (0%, 15%, or 20% based on income)
                </p>
                <p>
                  <strong>Dividends:</strong> Qualified dividends taxed at long-term capital gains rates
                </p>
                <p className="pt-2 italic">
                  Note: These are estimates. Consult a licensed tax professional for accurate tax advice.
                </p>
              </div>
            </div>

            {/* Closed Positions */}
            {taxReport.positions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">Closed Positions ({taxReport.positions.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {taxReport.positions.map((position, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{position.symbol}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              position.holdingPeriod <= 365
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'bg-green-500/10 text-green-500'
                            }`}>
                              {position.holdingPeriod <= 365 ? 'Short-Term' : 'Long-Term'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Quantity</p>
                              <p className="font-semibold">{position.quantity}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Buy → Sell</p>
                              <p className="font-semibold">
                                ${position.buyPrice.toFixed(2)} → ${position.sellPrice.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Holding Period</p>
                              <p className="font-semibold">{position.holdingPeriod} days</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Realized Gain</p>
                              <p className={`font-semibold ${position.realizedGain >= 0 ? 'text-chart-1' : 'text-destructive'}`}>
                                ${position.realizedGain.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(position.openDate).toLocaleDateString()} → {new Date(position.closeDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
              Report generated on {new Date(taxReport.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
