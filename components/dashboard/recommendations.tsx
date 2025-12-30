'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lightbulb, TrendingUp, Shield, DollarSign, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRecommendations } from '@/lib/python-service'

export interface Recommendation {
  type: 'rebalance' | 'diversify' | 'review' | 'tax' | 'dividend'
  title: string
  description: string
  action: string
  priority: 'low' | 'medium' | 'high'
}

export function Recommendations({ portfolio }: { portfolio: any[] }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const data = await getRecommendations(portfolio)
        setRecommendations(data.recommendations)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    if (portfolio.length > 0) {
      fetchRecommendations()
    } else {
      setLoading(false)
    }
  }, [portfolio])

  const getIcon = (type: string) => {
    switch (type) {
      case 'rebalance':
        return <Shield className="text-blue-500" size={18} />
      case 'diversify':
        return <TrendingUp className="text-green-500" size={18} />
      case 'review':
        return <Lightbulb className="text-yellow-500" size={18} />
      case 'tax':
        return <DollarSign className="text-purple-500" size={18} />
      default:
        return <ArrowRight className="text-gray-500" size={18} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-destructive bg-destructive/5'
      case 'medium':
        return 'border-accent bg-accent/5'
      default:
        return 'border-muted bg-muted/50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recommendations</CardTitle>
        <CardDescription>Personalized trading insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Analyzing portfolio...</p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations at this time</p>
        ) : (
          recommendations.map((rec, idx) => (
            <Alert key={idx} className={`${getPriorityColor(rec.priority)} cursor-pointer hover:opacity-80 transition`}>
              <div className="flex items-start gap-3">
                {getIcon(rec.type)}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{rec.title}</p>
                  <AlertDescription className="text-xs mt-1">{rec.description}</AlertDescription>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs font-medium text-muted-foreground">{rec.action}</p>
                    <Button size="sm" variant="ghost" className="h-6 px-2">
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  )
}
