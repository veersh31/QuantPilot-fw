'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Newspaper, ExternalLink, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { apiClient } from '@/lib/api-client'

interface NewsItem {
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

interface StockNewsProps {
  symbol: string | null
}

export function StockNews({ symbol }: StockNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchNews = async () => {
      if (!symbol) return

      setLoading(true)
      try {
        const data = await apiClient.post<{ news: NewsItem[] }>('/stocks/news', { symbol })
        setNews(data.news || [])
      } catch (error) {
        console.error('Error fetching news:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [symbol])

  const getTimeAgo = (dateString: string) => {
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

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-500 gap-1">
            <TrendingUp className="h-3 w-3" />
            Positive
          </Badge>
        )
      case 'negative':
        return (
          <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-500 gap-1">
            <TrendingDown className="h-3 w-3" />
            Negative
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Minus className="h-3 w-3" />
            Neutral
          </Badge>
        )
    }
  }

  if (!symbol) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Newspaper className="h-4 w-4" />
            Market News
          </CardTitle>
          <CardDescription>Select a stock to view related news</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Choose a stock from the search to see latest news
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Newspaper className="h-4 w-4" />
          {symbol} News & Analysis
        </CardTitle>
        <CardDescription>Latest market news and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {news.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No news available at the moment
              </p>
            ) : (
              news.map((item, index) => (
                <div key={index}>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-medium text-foreground">
                            {item.source}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(item.publishedAt)}
                          </span>
                          {item.sentiment && getSentimentBadge(item.sentiment)}
                        </div>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0 p-1"
                        onClick={(e) => {
                          if (item.url === '#') {
                            e.preventDefault()
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  {index < news.length - 1 && <Separator className="my-3" />}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
