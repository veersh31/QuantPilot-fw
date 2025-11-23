'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'
import { useChatWithAI } from '@/hooks/use-chat-ai'

function formatMessage(content: string) {
  return content
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((line, idx) => {
      // Remove markdown ** formatting
      const cleanLine = line.replace(/\*\*/g, '')
      return (
        <div key={idx} className="text-sm leading-relaxed mb-1">
          {cleanLine}
        </div>
      )
    })
}

export function AIChat({ portfolio, selectedStock }: any) {
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI trading advisor. Ask me about stocks, portfolio strategies, or market analysis.'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { generateResponse } = useChatWithAI()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Pass full conversation history for context
      const response = await generateResponse(input, portfolio, selectedStock, updatedMessages)
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      const errorMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted text-foreground rounded-bl-none'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm">{message.content}</p>
              ) : (
                <div className="text-sm space-y-1">
                  {formatMessage(message.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground px-4 py-3 rounded-lg rounded-bl-none">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="flex-shrink-0 border-t border-border bg-background p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about stocks, predictions, or portfolio..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="px-3"
          >
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
