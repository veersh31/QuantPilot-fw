'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimer-accepted')
    if (!hasAccepted) {
      setDismissed(false)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('disclaimer-accepted', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive/10 border-t-2 border-destructive">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-destructive flex-shrink-0 mt-1" size={24} />
          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-destructive">Investment Risk Disclaimer</h3>
            <p className="text-sm text-foreground">
              <strong>NOT FINANCIAL ADVICE:</strong> QuantPilot is for informational and educational purposes only.
              All trading and investment decisions are your sole responsibility. Stock trading involves substantial
              risk of loss. Past performance does not guarantee future results. Technical indicators and AI recommendations
              are not guarantees of future performance. Always conduct your own research and consult with a licensed
              financial advisor before making investment decisions. By using this platform, you acknowledge these risks.
            </p>
          </div>
          <Button
            onClick={handleAccept}
            size="sm"
            variant="default"
            className="flex-shrink-0"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  )
}
