import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      portfolio = [],
      selectedStock = null,
      conversationHistory = [],
      mlPredictions = null,
    } = body

    // Build context-aware system prompt
    let systemPrompt = \`You are an expert AI trading advisor for QuantPilot. You provide professional, data-driven advice based on real ML predictions.

CRITICAL: When ML predictions are available, ALWAYS cite the exact predicted prices and returns. Never estimate!

Your capabilities:
- Analyze ML price predictions with confidence scores
- Interpret backtesting results
- Provide portfolio advice
- Reference previous conversation
\`

    // Add portfolio context
    if (portfolio && portfolio.length > 0) {
      systemPrompt += \`\n**User Portfolio:**\n\`
      portfolio.forEach((stock: any) => {
        systemPrompt += \`- \${stock.symbol}: \${stock.quantity} shares at \$\${stock.purchasePrice}\n\`
      })
    }

    // Add ML predictions context
    if (mlPredictions && selectedStock) {
      const pred = mlPredictions.predictions
      const backtest = mlPredictions.backtest

      systemPrompt += \`\n**ML PREDICTIONS FOR \${selectedStock}:**\n\`
      systemPrompt += \`Current Price: \$\${mlPredictions.current_price}\n\n\`

      if (pred.nextDay) {
        systemPrompt += \`Next Day: \$\${pred.nextDay.predictedPrice} (\${pred.nextDay.predictedReturn}% return, \${(pred.nextDay.confidence * 100).toFixed(0)}% confidence)\n\`
      }

      if (pred.nextWeek) {
        systemPrompt += \`Next Week: \$\${pred.nextWeek.predictedPrice} (\${pred.nextWeek.predictedReturn}% return)\n\`
      }

      if (pred.nextMonth) {
        systemPrompt += \`Next Month: \$\${pred.nextMonth.predictedPrice} (\${pred.nextMonth.predictedReturn}% return)\n\`
      }

      if (backtest) {
        systemPrompt += \`\nBacktest: \${backtest.totalReturns}% return, \${backtest.winRate}% win rate, Sharpe \${backtest.sharpeRatio}\n\`
      }

      systemPrompt += \`\nIMPORTANT: Use these EXACT values when discussing \${selectedStock} predictions!\`
    }

    // Build messages with history
    const messages: any[] = [{ role: 'system', content: systemPrompt }]
    messages.push(...conversationHistory.slice(-10))
    
    if (!conversationHistory.some((msg: any) => msg.content === message)) {
      messages.push({ role: 'user', content: message })
    }

    // Call Groq
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, could not generate response.'

    return NextResponse.json({ response: aiResponse })
  } catch (error: any) {
    console.error('Error in AI chat:', error)
    return NextResponse.json({ error: 'Failed to generate response', details: error.message }, { status: 500 })
  }
}
