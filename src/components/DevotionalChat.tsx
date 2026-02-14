'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ChatMessage from './ChatMessage'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { typographer } from '@/lib/typographer'
import type {
  ChatCitation,
  ChatColorLabel,
  ChatGuardrailMeta,
  ChatMessage as ChatMessageType,
} from '@/types'

const FREE_TIER_LIMIT = 10

type ChatApiResponse = {
  message?: string
  usingUserKey?: boolean
  citations?: ChatCitation[]
  guardrails?: ChatGuardrailMeta
  error?: string
}

export default function DevotionalChat({
  devotionalSlug,
  devotionalTitle,
}: {
  devotionalSlug: string
  devotionalTitle?: string
}) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isOpen,
    highlightedText,
    open,
    close,
    addMessage,
    toggleFavorite,
    setColorLabel,
    setDevotionalContext,
    incrementDailyCount,
    getDailyCount,
  } = useChatStore()

  const anthropicApiKey = useSettingsStore((s) => s.anthropicApiKey)

  const saveChatNote = useCallback(
    async (message: ChatMessageType) => {
      try {
        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            devotionalSlug,
            annotationType: 'note',
            anchorText: message.highlightedText || null,
            body: message.content,
            style: {
              source: 'chat',
              messageId: message.id,
              colorLabel: message.colorLabel,
            },
          }),
        })
        if (response.ok) {
          window.dispatchEvent(new CustomEvent('libraryUpdated'))
        }
      } catch {
        // no-op
      }
    },
    [devotionalSlug],
  )

  // Set devotional context when component mounts
  useEffect(() => {
    setDevotionalContext(devotionalSlug)
    return () => setDevotionalContext(null)
  }, [devotionalSlug, setDevotionalContext])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Filter messages for current devotional context
  const contextMessages = messages.filter(
    (m) => m.devotionalSlug === devotionalSlug,
  )
  const latestAssistantMessage = [...contextMessages]
    .reverse()
    .find((message) => message.role === 'assistant')

  const dailyCount = getDailyCount()
  const isFreeTier = !anthropicApiKey
  const limitReached = isFreeTier && dailyCount >= FREE_TIER_LIMIT

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setError(null)
    setInput('')

    // Add user message
    addMessage({
      role: 'user',
      content: text,
      devotionalSlug,
      highlightedText: highlightedText || undefined,
    })

    setIsLoading(true)

    try {
      // Build conversation history for API
      const apiMessages = [
        ...contextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-daily-count': dailyCount.toString(),
        },
        body: JSON.stringify({
          messages: apiMessages,
          devotionalSlug,
          highlightedText: highlightedText || undefined,
          userApiKey: anthropicApiKey || undefined,
        }),
      })

      const data = (await response.json()) as ChatApiResponse

      if (!response.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }

      // Add assistant message
      addMessage({
        role: 'assistant',
        content: data.message || 'I was not able to generate a response.',
        devotionalSlug,
        citations: Array.isArray(data.citations) ? data.citations : [],
        guardrails: data.guardrails,
      })

      // Increment daily count for free tier
      if (!anthropicApiKey) {
        incrementDailyCount()
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }, [
    input,
    isLoading,
    addMessage,
    devotionalSlug,
    highlightedText,
    contextMessages,
    dailyCount,
    anthropicApiKey,
    incrementDailyCount,
  ])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* FAB — Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => open()}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-gold text-tehom transition-all duration-300 hover:-translate-y-0.5"
          style={{ zIndex: 'var(--z-fixed)' }}
          aria-label="Open biblical research chat"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
            />
          </svg>
        </button>
      )}

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 flex flex-col bg-page sm:bottom-4 sm:right-4 sm:rounded-sm"
            style={{
              zIndex: 'var(--z-modal)',
              width: '100%',
              maxWidth: '440px',
              height: '70vh',
              maxHeight: '600px',
              border: '1px solid var(--color-border)',
              boxShadow: 'none',
            }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div>
                <p className="text-label vw-small text-gold">
                  BIBLICAL RESEARCH
                </p>
                {devotionalTitle && (
                  <p className="vw-small mt-1 text-muted">
                    {typographer(devotionalTitle)}
                  </p>
                )}
              </div>
              <button
                onClick={close}
                className="flex h-9 w-9 items-center justify-center text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                aria-label="Close chat"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div
                className="mb-4 border px-3 py-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small text-gold">CHAT SCOPE</p>
                <p className="vw-small mt-1 text-muted">
                  {typographer(
                    'Local corpus only. No internet search. Responses are grounded in your current devotional context and local reference volumes.',
                  )}
                </p>
              </div>

              {latestAssistantMessage?.guardrails && (
                <div className="mb-4">
                  <p className="vw-small text-muted">
                    Sources in scope:{' '}
                    {latestAssistantMessage.guardrails.sources.length}
                  </p>
                </div>
              )}

              {contextMessages.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-serif-italic vw-body mb-4 text-secondary">
                    {highlightedText
                      ? typographer(`Ask about: \u201c${highlightedText}\u201d`)
                      : typographer(
                          'Ask about Scripture, theology, word studies, historical context\u2026',
                        )}
                  </p>
                  {isFreeTier && (
                    <p className="vw-small text-muted">
                      {FREE_TIER_LIMIT - dailyCount} questions remaining today
                    </p>
                  )}
                </div>
              )}

              {contextMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onToggleFavorite={toggleFavorite}
                  onSetColorLabel={(id: string, label: ChatColorLabel) =>
                    setColorLabel(id, label)
                  }
                  onSaveNote={(message) => void saveChatNote(message)}
                />
              ))}

              {isLoading && (
                <div className="mb-4 mr-8">
                  <p className="text-serif-italic vw-small animate-pulse text-muted">
                    Thinking...
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 mr-8">
                  <p
                    className="vw-small"
                    style={{ color: 'var(--color-error)' }}
                  >
                    {typographer(error)}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="shrink-0 px-5 py-4"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              {limitReached ? (
                <p className="vw-small text-center text-muted">
                  {typographer(
                    'You\u2019ve used your daily questions. Add your own API key in Settings for unlimited access.',
                  )}
                </p>
              ) : (
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent vw-small text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                    style={{
                      maxHeight: '120px',
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: '8px',
                    }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 pb-2 text-gold transition-opacity duration-200 disabled:opacity-30"
                    aria-label="Send message"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Free tier counter */}
              {isFreeTier && !limitReached && contextMessages.length > 0 && (
                <p
                  className="mt-2 text-center vw-small text-muted"
                  style={{ fontSize: '0.7rem' }}
                >
                  {FREE_TIER_LIMIT - dailyCount} questions remaining today
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
