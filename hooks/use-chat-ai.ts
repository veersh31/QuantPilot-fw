import { useCallback } from 'react'

export function useChatWithAI() {
  const generateResponse = useCallback(
    async (
      userMessage: string,
      portfolio: any[],
      selectedStock: string | null,
      conversationHistory: any[] = []
    ) => {
      try {
        // Fetch ML predictions for selected stock if available
        let mlPredictions = null
        if (selectedStock) {
          try {
            const mlResponse = await fetch('http://localhost:8000/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol: selectedStock }),
            })
            if (mlResponse.ok) {
              mlPredictions = await mlResponse.json()
            }
          } catch (err) {
            console.log('ML predictions not available')
          }
        }

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            portfolio,
            selectedStock,
            conversationHistory: conversationHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            mlPredictions,
            timestamp: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get AI response')
        }

        const data = await response.json()
        return data.response
      } catch (error) {
        console.error('Error calling AI API:', error)
        throw error
      }
    },
    []
  )

  return { generateResponse }
}
