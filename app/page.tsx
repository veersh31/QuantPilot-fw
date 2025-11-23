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
import { DisclaimerBanner } from '@/components/legal/disclaimer-banner'
import { DisclaimerFooter } from '@/components/legal/disclaimer-footer'
import { PaperTrading } from '@/components/portfolio/paper-trading'
import { TransactionManager } from '@/components/portfolio/transaction-manager'
import { TaxReportComponent } from '@/components/portfolio/tax-report'
import { WelcomeScreen } from '@/components/auth/welcome-screen'
import { ModeSelection } from '@/components/auth/mode-selection'
import { useAuth } from '@/contexts/auth-context'
import { PaperTradingAccount } from '@/lib/types/portfolio'
import { PredictionDashboard } from '@/components/ml/prediction-dashboard'
import { Button } from '@/components/ui/button'
import { MessageSquare, X } from 'lucide-react'
import { RiskCalculator } from '@/components/risk/risk-calculator'
import { StockComparison } from '@/components/comparison/stock-comparison'
import { DividendTracker } from '@/components/portfolio/dividend-tracker'
import { CorrelationMatrix } from '@/components/portfolio/correlation-matrix'
import { StockScreener } from '@/components/screener/stock-screener'
import { RebalancingCalculator } from '@/components/portfolio/rebalancing-calculator'
import { toast } from 'sonner'

export default function Home() {
  const { profile, isAuthenticated, hasCompletedOnboarding, setProfile, completeOnboarding, currentMode } = useAuth()
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [portfolio, setPortfolio, portfolioLoaded] = useLocalStorage<any[]>('quantpilot-portfolio', [])
  const [paperAccount, setPaperAccount] = useLocalStorage<PaperTradingAccount | null>('quantpilot-paper-account', null)
  const [showModeSelection, setShowModeSelection] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleUpdateQuantity = (symbol: string, newQuantity: number) => {
    setPortfolio(portfolio.map(stock =>
      stock.symbol === symbol ? { ...stock, quantity: newQuantity } : stock
    ))
  }

  const handleRemoveStock = (symbol: string) => {
    setPortfolio(portfolio.filter(stock => stock.symbol !== symbol))
    toast.success(`${symbol} removed from portfolio`)
  }

  const handleModeSelect = (mode: 'paper' | 'real', paperCash?: number) => {
    if (mode === 'paper' && paperCash && !paperAccount) {
      // Create paper account
      const account: PaperTradingAccount = {
        accountId: `paper-${Date.now()}`,
        name: 'Paper Trading Account',
        startingCash: paperCash,
        currentCash: paperCash,
        positions: [],
        transactions: [],
        summary: {
          totalValue: paperCash,
          totalCostBasis: 0,
          totalUnrealizedGain: 0,
          totalUnrealizedGainPercent: 0,
          totalRealizedGain: 0,
          totalDividends: 0,
          totalFees: 0,
          numberOfPositions: 0,
          cash: paperCash,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        isActive: true
      }
      setPaperAccount(account)
    }
    completeOnboarding()
  }

  // Show welcome screen if no profile
  if (!profile) {
    return <WelcomeScreen onComplete={(newProfile) => {
      setProfile(newProfile)
      setShowModeSelection(true)
    }} />
  }

  // Show mode selection if profile exists but onboarding not completed
  if (profile && !hasCompletedOnboarding) {
    return <ModeSelection profile={profile} onModeSelect={handleModeSelect} />
  }

  return (
    <StockDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex flex-col">
        <DashboardHeader />
        <DisclaimerBanner />

        <main className="container mx-auto px-4 py-8 flex-grow max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Analytics */}
          <div className="lg:col-span-2 space-y-6">
            <PortfolioOverview portfolio={portfolio} />

            {selectedStock && <StockQuote symbol={selectedStock} />}

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-1">
                <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="screener" className="text-xs md:text-sm">Screener</TabsTrigger>
                <TabsTrigger value="portfolio" className="text-xs md:text-sm">Portfolio</TabsTrigger>
                <TabsTrigger value="analysis" className="text-xs md:text-sm">Analysis</TabsTrigger>
                <TabsTrigger value="ml-predictions" className="text-xs md:text-sm">ML Predictions</TabsTrigger>
                <TabsTrigger value="account" className="text-xs md:text-sm">Account</TabsTrigger>
              </TabsList>

              {/* Overview Tab - Search Stocks */}
              <TabsContent value="overview" className="mt-4">
                <StockSearch
                  onStockSelect={setSelectedStock}
                  onAddToPortfolio={(stock: any) => {
                    if (!portfolio.find(p => p.symbol === stock.symbol)) {
                      setPortfolio([...portfolio, stock])
                      toast.success(`${stock.symbol} added to portfolio`, {
                        description: `${stock.quantity} shares at $${stock.purchasePrice}`
                      })
                    } else {
                      toast.info(`${stock.symbol} is already in your portfolio`)
                    }
                  }}
                />
              </TabsContent>

              {/* Screener Tab - Stock Screener */}
              <TabsContent value="screener" className="mt-4">
                <StockScreener />
              </TabsContent>

              {/* Portfolio Tab - Holdings, Performance, Dividends & Rebalancing */}
              <TabsContent value="portfolio" className="mt-4">
                <Tabs defaultValue="holdings" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="holdings">Holdings</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="dividends">Dividends</TabsTrigger>
                    <TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
                  </TabsList>

                  <TabsContent value="holdings" className="mt-4">
                    <PortfolioHoldings
                      portfolio={portfolio}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemoveStock={handleRemoveStock}
                    />
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

                  <TabsContent value="dividends" className="mt-4">
                    <DividendTracker portfolio={portfolio} />
                  </TabsContent>

                  <TabsContent value="rebalancing" className="mt-4">
                    <RebalancingCalculator portfolio={portfolio} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* Analysis Tab - Charts, Metrics, News, Risk, Compare */}
              <TabsContent value="analysis" className="mt-4">
                <Tabs defaultValue="charts" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="charts">Charts</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="compare">Compare</TabsTrigger>
                    <TabsTrigger value="risk">Risk Tools</TabsTrigger>
                    <TabsTrigger value="news">News</TabsTrigger>
                  </TabsList>

                  <TabsContent value="charts" className="mt-4">
                    {selectedStock ? (
                      <ErrorBoundary>
                        <AnalyticsCharts symbol={selectedStock} />
                      </ErrorBoundary>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        Select a stock to view charts
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

                  <TabsContent value="compare" className="mt-4">
                    <ErrorBoundary>
                      <StockComparison />
                    </ErrorBoundary>
                  </TabsContent>

                  <TabsContent value="risk" className="mt-4">
                    <Tabs defaultValue="calculator" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="calculator">Risk Calculator</TabsTrigger>
                        <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
                      </TabsList>

                      <TabsContent value="calculator" className="mt-4">
                        <RiskCalculator portfolio={portfolio} />
                      </TabsContent>

                      <TabsContent value="correlation" className="mt-4">
                        <CorrelationMatrix portfolio={portfolio} />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="news" className="mt-4">
                    <StockNews symbol={selectedStock} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              {/* ML Predictions Tab */}
              <TabsContent value="ml-predictions" className="mt-4">
                {selectedStock ? (
                  <ErrorBoundary>
                    <PredictionDashboard symbol={selectedStock} />
                  </ErrorBoundary>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a stock or ETF to view ML price predictions
                  </div>
                )}
              </TabsContent>

              {/* Account Tab - Transactions, Tax Reports (Paper Trading only in paper mode) */}
              <TabsContent value="account" className="mt-4">
                <Tabs defaultValue={currentMode === 'paper' ? 'paper-trading' : 'transactions'} className="w-full">
                  <TabsList className={`grid w-full ${currentMode === 'paper' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {currentMode === 'paper' && (
                      <TabsTrigger value="paper-trading">Paper Trading</TabsTrigger>
                    )}
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="taxes">Tax Reports</TabsTrigger>
                  </TabsList>

                  {currentMode === 'paper' && (
                    <TabsContent value="paper-trading" className="mt-4">
                      <PaperTrading />
                    </TabsContent>
                  )}

                  <TabsContent value="transactions" className="mt-4">
                    <TransactionManager />
                  </TabsContent>

                  <TabsContent value="taxes" className="mt-4">
                    <TaxReportComponent />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Watchlist, Alerts & Recommendations */}
          <div className="space-y-6">
            <Watchlist onStockSelect={setSelectedStock} />
            <PriceAlerts />
            {portfolio.length > 0 && <Recommendations portfolio={portfolio} />}
          </div>
        </div>
      </main>

      {/* Floating AI Chat Button */}
      <Button
        size="lg"
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110 z-50 bg-gradient-to-br from-primary to-primary/80"
      >
        {isChatOpen ? <X size={28} strokeWidth={2.5} /> : <MessageSquare size={28} strokeWidth={2.5} />}
      </Button>

      {/* Sliding Chat Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[600px] bg-background border-l border-border shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isChatOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MessageSquare className="text-primary" size={24} />
              </div>
              <h2 className="text-xl font-bold">AI Trading Advisor</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChatOpen(false)}
              className="hover:bg-muted"
            >
              <X size={20} />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIChat portfolio={portfolio} selectedStock={selectedStock} />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setIsChatOpen(false)}
        />
      )}

      {/* Legal Disclaimer Footer - Temporarily removed */}
      {/* <DisclaimerFooter /> */}
    </div>
    </StockDataProvider>
  )
}
