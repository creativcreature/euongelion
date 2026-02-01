'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SpiritualChatProps {
  context?: {
    seriesSlug?: string
    dayNumber?: number
    devotionalTitle?: string
  }
  className?: string
}

export default function SpiritualChat({ context, className = '' }: SpiritualChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: 'greeting',
        role: 'assistant',
        content: context?.devotionalTitle
          ? `I see you're reading "${context.devotionalTitle}". What's on your heart as you reflect on this?`
          : "Welcome. What's stirring in your soul today?",
        timestamp: new Date(),
      }
      setMessages([greeting])
    }
  }, [isOpen, context?.devotionalTitle])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
            .filter((m) => m.id !== 'greeting' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to get response')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 
          bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 
          rounded-full shadow-lg hover:shadow-xl transition-all
          hover:scale-105 ${className}`}
        aria-label="Open spiritual guide chat"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-medium">Seek Guidance</span>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] 
      bg-white dark:bg-stone-900 rounded-2xl shadow-2xl 
      flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700 ${className}`}
      style={{ height: 'min(500px, calc(100vh - 6rem))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 
        bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
        <div>
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">Spiritual Guide</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">A space for reflection</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-br-md'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-md'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 dark:bg-stone-800 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your heart..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-4 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-600
              bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100
              placeholder-stone-400 dark:placeholder-stone-500
              focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500
              resize-none disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '100px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900
              rounded-xl font-medium text-sm
              hover:bg-stone-800 dark:hover:bg-stone-200 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 text-center">
          Powered by AI · Not a replacement for pastoral care
        </p>
      </div>
    </div>
  )
}
