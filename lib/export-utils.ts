export function exportPortfolioToCSV(portfolio: any[]) {
  // Create CSV header
  const headers = [
    'Symbol',
    'Name',
    'Shares',
    'Average Cost',
    'Current Price',
    'Market Value',
    'Cost Basis',
    'Total Gain/Loss',
    'Gain/Loss %'
  ]

  // Create CSV rows
  const rows = portfolio.map(stock => {
    const costBasis = stock.avgCost * stock.quantity
    const currentValue = stock.price * stock.quantity
    const totalGainLoss = currentValue - costBasis
    const totalGainLossPercent = ((totalGainLoss / costBasis) * 100).toFixed(2)

    return [
      stock.symbol,
      stock.name,
      stock.quantity.toFixed(2),
      stock.avgCost.toFixed(2),
      stock.price.toFixed(2),
      currentValue.toFixed(2),
      costBasis.toFixed(2),
      totalGainLoss.toFixed(2),
      totalGainLossPercent
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `portfolio_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportWatchlistToCSV(watchlist: any[]) {
  const headers = ['Symbol', 'Name', 'Current Price', 'Change', 'Change %']

  const rows = watchlist.map(stock => [
    stock.symbol,
    stock.name,
    stock.price?.toFixed(2) || 'N/A',
    stock.change?.toFixed(2) || 'N/A',
    stock.changePercent?.toFixed(2) || 'N/A'
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `watchlist_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
