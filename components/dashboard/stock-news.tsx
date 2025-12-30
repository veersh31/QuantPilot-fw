'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Newspaper, ExternalLink, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { getNews } from '@/lib/python-service'

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
        const data = await getNews(symbol)
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

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-chart-1'
      case 'negative':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  if (!symbol) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper size={20} />
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper size={20} />
          {symbol} News
        </CardTitle>
        <CardDescription>Latest news and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {news.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No news available at the moment
              </p>
            ) : (
              news.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm leading-tight mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {item.summary}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium">{item.source}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {getTimeAgo(item.publishedAt)}
                        </span>
                        {item.sentiment && (
                          <span className={`font-medium ${getSentimentColor(item.sentiment)}`}>
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      onClick={(e) => {
                        // Prevent navigation for demo links
                        if (item.url === '#') {
                          e.preventDefault()
                        }
                      }}
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
