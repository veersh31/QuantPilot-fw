'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, TrendingUp, TrendingDown, DollarSign, Receipt, X } from 'lucide-react'
import { Transaction, TransactionType, PaperTradingAccount } from '@/lib/types/portfolio'
import { useLocalStorage } from '@/hooks/use-local-storage'

export function TransactionManager() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('quantpilot-transactions', [])
  const [paperAccount, setPaperAccount] = useLocalStorage<PaperTradingAccount | null>('quantpilot-paper-account', null)
  const [showForm, setShowForm] = useState(false)

  // Check if paper trading mode is active
  const isPaperMode = paperAccount?.isActive || false
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'buy' as TransactionType,
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    fees: '',
    notes: ''
  })

  const handleAddTransaction = () => {
    if (!formData.symbol || !formData.quantity || !formData.price) {
      alert('Please fill in required fields')
      return
    }

    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      date: new Date(formData.date).toISOString(),
      fees: parseFloat(formData.fees) || 0,
      notes: formData.notes,
      createdAt: new Date().toISOString()
    }

    // Paper Trading Mode: Validate and update paper account
    if (isPaperMode && paperAccount) {
      if (formData.type === 'buy') {
        const totalCost = (transaction.quantity * transaction.price) + transaction.fees
        if (totalCost > paperAccount.currentCash) {
          alert(`Insufficient funds! You have $${paperAccount.currentCash.toFixed(2)} but need $${totalCost.toFixed(2)}`)
          return
        }
        // Deduct cash
        paperAccount.currentCash -= totalCost
      } else if (formData.type === 'sell') {
        const proceeds = (transaction.quantity * transaction.price) - transaction.fees
        // Add cash
        paperAccount.currentCash += proceeds
      }

      // Add transaction to paper account
      paperAccount.transactions = [transaction, ...paperAccount.transactions]
      setPaperAccount({ ...paperAccount })
    } else {
      // Real Mode: Just save transaction
      setTransactions([transaction, ...transactions])
    }
    setShowForm(false)
    setFormData({
      symbol: '',
      type: 'buy',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
      fees: '',
      notes: ''
    })
  }

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(transactions.filter(t => t.id !== id))
    }
  }

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'buy': return <TrendingUp className="text-chart-1" size={16} />
      case 'sell': return <TrendingDown className="text-destructive" size={16} />
      case 'dividend': return <DollarSign className="text-blue-500" size={16} />
      default: return <Receipt size={16} />
    }
  }

  const getTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'buy': return 'text-chart-1'
      case 'sell': return 'text-destructive'
      case 'dividend': return 'text-blue-500'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction History</span>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} className="mr-2" />
            Add Transaction
          </Button>
        </CardTitle>
        <CardDescription>
          {isPaperMode ? (
            <span className="text-blue-500 font-semibold">
              Paper Trading Mode - Virtual Money Only
            </span>
          ) : (
            'Track all your trades with dates, prices, and fees'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Transaction Form */}
        {showForm && (
          <div className="p-4 border border-border rounded-lg space-y-3 bg-muted/50">
            <h4 className="font-semibold text-sm">New Transaction</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Symbol *</label>
                <Input
                  placeholder="AAPL"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="dividend">Dividend</option>
                  <option value="split">Stock Split</option>
                  <option value="fee">Fee/Commission</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  {formData.type === 'dividend' ? 'Amount *' : 'Quantity *'}
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder={formData.type === 'dividend' ? '25.00' : '10'}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {formData.type === 'split' ? 'Split Ratio *' : 'Price *'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={formData.type === 'split' ? '2' : '150.00'}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fees/Commission</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.fees}
                  onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddTransaction} className="flex-1">
                Add Transaction
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Show paper account transactions if in paper mode, otherwise show real transactions */}
          {(() => {
            const displayTransactions = isPaperMode && paperAccount
              ? paperAccount.transactions
              : transactions

            return displayTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet. Add your first trade to get started.
              </p>
            ) : (
              displayTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getTypeIcon(txn.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{txn.symbol}</span>
                      <span className={`text-xs uppercase ${getTypeColor(txn.type)}`}>
                        {txn.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {txn.type !== 'dividend' && `${txn.quantity} shares @ `}
                      ${txn.price.toFixed(2)}
                      {txn.fees > 0 && ` • Fee: $${txn.fees.toFixed(2)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(txn.date).toLocaleDateString()}
                    </p>
                    {txn.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        {txn.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {txn.type === 'buy' && '-'}
                      {txn.type === 'sell' && '+'}
                      ${(txn.quantity * txn.price + (txn.type === 'buy' ? txn.fees : -txn.fees)).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTransaction(txn.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))
            )
          })()}
        </div>

        {(() => {
          const displayTransactions = isPaperMode && paperAccount
            ? paperAccount.transactions
            : transactions

          return displayTransactions.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {displayTransactions.length} total transaction{displayTransactions.length !== 1 ? 's' : ''}
              {isPaperMode && ' (Virtual)'}
            </p>
          </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
