'use client'

import { useState } from 'react'
import { DashboardHeader } from '@/components/dashboard/header'
import { PortfolioOverview } from '@/components/dashboard/portfolio-overview'
import { PortfolioHoldings } from '@/components/dashboard/portfolio-holdings'
import { StockSearch } from '@/components/dashboard/stock-search'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { StockQuote } from '@/components/dashboard/stock-quote'
import { PerformanceMetrics } from '@/components/dashboard/performance-metrics'
import { Recommendations } from '@/components/dashboard/recommendations'
import { InDepthAnalytics } from '@/components/dashboard/in-depth-analytics'
import { AIChat } from '@/components/ai/ai-chat'
import { Watchlist } from '@/components/dashboard/watchlist'
import { PriceAlerts } from '@/components/dashboard/price-alerts'
import { StockNews } from '@/components/dashboard/stock-news'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { ErrorBoundary } from '@/components/error-boundary'
import { StockDataProvider } from '@/contexts/stock-data-context'

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [portfolio, setPortfolio, portfolioLoaded] = useLocalStorage<any[]>('quantpilot-portfolio', [])

  const handleUpdateQuantity = (symbol: string, newQuantity: number) => {
    setPortfolio(portfolio.map(stock =>
      stock.symbol === symbol ? { ...stock, quantity: newQuantity } : stock
    ))
  }

  const handleRemoveStock = (symbol: string) => {
    setPortfolio(portfolio.filter(stock => stock.symbol !== symbol))
  }

  return (
    <StockDataProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader />

        <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <PortfolioOverview portfolio={portfolio} />
            
            {selectedStock && <StockQuote symbol={selectedStock} />}
            
            <Tabs defaultValue="search" className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
                <TabsTrigger value="search" className="text-xs md:text-sm">Search</TabsTrigger>
                <TabsTrigger value="holdings" className="text-xs md:text-sm">Holdings</TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs md:text-sm">Charts</TabsTrigger>
                <TabsTrigger value="metrics" className="text-xs md:text-sm">Metrics</TabsTrigger>
                <TabsTrigger value="news" className="text-xs md:text-sm">News</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs md:text-sm col-span-3 md:col-span-1">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="mt-4">
                <StockSearch
                  onStockSelect={setSelectedStock}
                  onAddToPortfolio={(stock: any) => {
                    if (!portfolio.find(p => p.symbol === stock.symbol)) {
                      setPortfolio([...portfolio, stock])
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="holdings" className="mt-4">
                <PortfolioHoldings
                  portfolio={portfolio}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveStock={handleRemoveStock}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                {selectedStock ? (
                  <ErrorBoundary>
                    <AnalyticsCharts symbol={selectedStock} />
                  </ErrorBoundary>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a stock to view analytics
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="mt-4">
                {selectedStock ? (
                  <ErrorBoundary>
                    <InDepthAnalytics symbol={selectedStock} />
                  </ErrorBoundary>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a stock to view metrics
                  </div>
                )}
              </TabsContent>

              <TabsContent value="news" className="mt-4">
                <StockNews symbol={selectedStock} />
              </TabsContent>

              <TabsContent value="performance" className="mt-4">
                {portfolio.length > 0 ? (
                  <PerformanceMetrics portfolio={portfolio} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Add stocks to your portfolio to view performance
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - AI Chat, Watchlist, Alerts & Recommendations */}
          <div className="space-y-6">
            <AIChat portfolio={portfolio} selectedStock={selectedStock} />
            <Watchlist onStockSelect={setSelectedStock} />
            <PriceAlerts />
            {portfolio.length > 0 && <Recommendations portfolio={portfolio} />}
          </div>
        </div>
      </main>
    </div>
    </StockDataProvider>
  )
}
