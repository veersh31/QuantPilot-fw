'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Newspaper, TrendingUp, Globe, ExternalLink, Calendar, Building2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface NewsItem {
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
  sentiment: string
  image?: string
}

interface MarketNewsProps {
  selectedStock?: string | null
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else {
    return 'Just now'
  }
}

function getSentimentBadge(sentiment: string) {
  switch (sentiment.toLowerCase()) {
    case 'positive':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Positive</Badge>
    case 'negative':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Negative</Badge>
    default:
      return <Badge variant="outline">Neutral</Badge>
  }
}

export function MarketNews({ selectedStock }: MarketNewsProps) {
  const [marketNews, setMarketNews] = useState<NewsItem[]>([])
  const [stockNews, setStockNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('market')

  useEffect(() => {
    fetchMarketNews()
  }, [])

  useEffect(() => {
    if (selectedStock && activeTab === 'stock') {
      fetchStockNews(selectedStock)
    }
  }, [selectedStock, activeTab])

  const fetchMarketNews = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stocks/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'SPY' }),
      })
      if (response.ok) {
        const data = await response.json()
        setMarketNews(data.news || [])
      }
    } catch (error) {
      console.error('Failed to fetch market news:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStockNews = async (symbol: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/stocks/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      if (response.ok) {
        const data = await response.json()
        setStockNews(data.news || [])
      }
    } catch (error) {
      console.error('Failed to fetch stock news:', error)
    } finally {
      setLoading(false)
    }
  }

  const NewsCard = ({ item }: { item: NewsItem }) => (
    <Card className="hover:shadow-lg transition-shadow border-border/50">
      <CardContent className="p-5">
        <div className="flex gap-4">
          {item.image && (
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors line-clamp-2">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1">
                  {item.title}
                  <ExternalLink size={14} className="flex-shrink-0 mt-1 opacity-50" />
                </a>
              </h3>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {item.summary}
            </p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 size={12} />
                  {item.source}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {getTimeAgo(item.publishedAt)}
                </span>
              </div>
              {getSentimentBadge(item.sentiment)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex gap-4">
              <Skeleton className="w-24 h-24 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-600/15 via-purple-600/10 to-indigo-600/15 border-blue-500/30 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Newspaper className="text-blue-600 dark:text-blue-400" size={28} />
            </div>
            <div>
              <CardTitle className="text-2xl">Market News & Insights</CardTitle>
              <CardDescription className="text-base">
                Real-time financial news powered by Finnhub
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market" className="flex items-center gap-2">
            <Globe size={16} />
            Market News (S&P 500)
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2" disabled={!selectedStock}>
            <TrendingUp size={16} />
            {selectedStock ? `${selectedStock} News` : 'Select a Stock'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="mt-6 space-y-4">
          {loading ? (
            <LoadingSkeleton />
          ) : marketNews.length > 0 ? (
            marketNews.map((item, idx) => <NewsCard key={idx} item={item} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No market news available at the moment
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stock" className="mt-6 space-y-4">
          {loading ? (
            <LoadingSkeleton />
          ) : stockNews.length > 0 ? (
            stockNews.map((item, idx) => <NewsCard key={idx} item={item} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {selectedStock
                  ? `No news available for ${selectedStock} at the moment`
                  : 'Select a stock to view news'}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
