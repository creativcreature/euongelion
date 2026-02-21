'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  ChatSourceCard,
} from '@/types'

type ProviderId = 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'

type ProviderAvailability = {
  provider: Exclude<ProviderId, 'auto'>
  available: boolean
  reason?: string
  using: 'platform_key' | 'byo_key' | 'unavailable'
}

type ProvidersPayload = {
  ok?: boolean
  providers?: ProviderAvailability[]
  usage?: {
    quotaState?: string
    requiresByo?: boolean
  }
}

type ChatApiResponse = {
  message?: string
  citations?: ChatCitation[]
  sourceCards?: ChatSourceCard[]
  guardrails?: ChatGuardrailMeta
  brainProvider?: string
  retrievalMode?: 'closed' | 'open_web'
  error?: string
  usage?: {
    quotaState?: 'active' | 'near_limit' | 'halted_platform' | 'byo_required'
    platformBudgetRemainingUsd?: number
    chargedToPlatform?: boolean
  }
}

type ChatStreamEvent =
  | { event: 'chunk'; delta: string }
  | { event: 'final'; payload: ChatApiResponse }
  | { event: 'error'; error: string }

const PROVIDER_LABELS: Record<ProviderId, string> = {
  auto: 'Auto',
  openai: 'Claude/OpenAI',
  google: 'Google',
  minimax: 'MiniMax',
  nvidia_kimi: 'NVIDIA Kimi',
}

function routeFromThreadSlug(slug: string): string {
  if (slug.startsWith('plan-')) {
    const match = slug.match(/^plan-([a-f0-9-]+)-day-(\d+)$/i)
    if (match?.[1] && match?.[2]) {
      return `/soul-audit/results?planToken=${match[1]}&day=${match[2]}`
    }
    return '/soul-audit/results'
  }

  return `/devotional/${slug}`
}

export default function DevotionalChat({
  devotionalSlug,
  devotionalTitle,
}: {
  devotionalSlug: string
  devotionalTitle?: string
}) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openWebMode, setOpenWebMode] = useState(false)
  const [providers, setProviders] = useState<ProviderAvailability[]>([])
  const [providersLoaded, setProvidersLoaded] = useState(false)
  const [quotaState, setQuotaState] = useState<
    'active' | 'near_limit' | 'halted_platform' | 'byo_required' | null
  >(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLElement | null>(null)
  const chatRequestAbortRef = useRef<AbortController | null>(null)
  const providersAbortRef = useRef<AbortController | null>(null)

  const {
    messages,
    isOpen,
    highlightedText,
    open,
    close,
    addMessage,
    updateMessage,
    toggleFavorite,
    setColorLabel,
    setDevotionalContext,
    setThreadBrainMode,
    getThreadBrainMode,
    isThreadTrimmed,
  } = useChatStore()

  const {
    defaultBrainMode,
    openWebDefaultEnabled,
    chatSidebarOpen,
    setChatSidebarOpen,
    openaiApiKey,
    googleApiKey,
    minimaxApiKey,
    nvidiaKimiApiKey,
    anthropicApiKey,
  } = useSettingsStore()

  const threadOverride = getThreadBrainMode(devotionalSlug)
  const activeBrainMode = threadOverride || defaultBrainMode

  useEffect(() => {
    setOpenWebMode(openWebDefaultEnabled)
  }, [openWebDefaultEnabled])

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
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string
            code?: string
          }
          if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
            setError(
              payload.error || 'Sign in is required before saving notes.',
            )
          }
          return
        }
        window.dispatchEvent(new CustomEvent('libraryUpdated'))
      } catch {
        // no-op
      }
    },
    [devotionalSlug],
  )

  useEffect(() => {
    setDevotionalContext(devotionalSlug)
    return () => setDevotionalContext(null)
  }, [devotionalSlug, setDevotionalContext])

  useEffect(() => {
    if (!chatSidebarOpen) return
    if (!isOpen) {
      open()
    }
  }, [chatSidebarOpen, isOpen, open])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages])

  useEffect(() => {
    if (!isOpen) return
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 180)
    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setChatSidebarOpen(false)
      close()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [isOpen, close, setChatSidebarOpen])

  useEffect(() => {
    return () => {
      chatRequestAbortRef.current?.abort()
      providersAbortRef.current?.abort()
    }
  }, [])

  const contextMessages = useMemo(
    () => messages.filter((m) => m.devotionalSlug === devotionalSlug),
    [messages, devotionalSlug],
  )

  const threadHistory = useMemo(() => {
    const map = new Map<
      string,
      {
        slug: string
        title: string
        lastAt: string
        excerpt: string
      }
    >()

    for (const message of messages) {
      if (!message.devotionalSlug) continue
      const existing = map.get(message.devotionalSlug)
      if (!existing || existing.lastAt < message.createdAt) {
        map.set(message.devotionalSlug, {
          slug: message.devotionalSlug,
          title:
            message.devotionalSlug === devotionalSlug
              ? devotionalTitle || message.devotionalSlug
              : message.devotionalSlug,
          lastAt: message.createdAt,
          excerpt: message.content.slice(0, 92),
        })
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt),
    )
  }, [messages, devotionalSlug, devotionalTitle])

  async function loadProviders() {
    providersAbortRef.current?.abort()
    const controller = new AbortController()
    providersAbortRef.current = controller
    try {
      const response = await fetch('/api/brain/providers', {
        cache: 'no-store',
        signal: controller.signal,
      })
      const payload = (await response.json()) as ProvidersPayload
      if (response.ok && payload.ok) {
        setProviders(Array.isArray(payload.providers) ? payload.providers : [])
        if (
          payload.usage?.quotaState === 'active' ||
          payload.usage?.quotaState === 'near_limit' ||
          payload.usage?.quotaState === 'halted_platform' ||
          payload.usage?.quotaState === 'byo_required'
        ) {
          setQuotaState(payload.usage.quotaState)
        }
      }
    } catch {
      // no-op
    } finally {
      setProvidersLoaded(true)
      if (providersAbortRef.current === controller) {
        providersAbortRef.current = null
      }
    }
  }

  useEffect(() => {
    if (!isOpen || providersLoaded) return
    void loadProviders()
  }, [isOpen, providersLoaded])

  const availableProviderModes = useMemo(() => {
    const localByo: Partial<Record<Exclude<ProviderId, 'auto'>, boolean>> = {
      openai: Boolean((openaiApiKey || anthropicApiKey).trim()),
      google: Boolean(googleApiKey.trim()),
      minimax: Boolean(minimaxApiKey.trim()),
      nvidia_kimi: Boolean(nvidiaKimiApiKey.trim()),
    }

    const options: ProviderId[] = ['auto']
    ;(['openai', 'google', 'minimax', 'nvidia_kimi'] as const).forEach(
      (provider) => {
        const server = providers.find((entry) => entry.provider === provider)
        if (server?.available || localByo[provider]) {
          options.push(provider)
        }
      },
    )

    return options
  }, [
    providers,
    openaiApiKey,
    anthropicApiKey,
    googleApiKey,
    minimaxApiKey,
    nvidiaKimiApiKey,
    updateMessage,
  ])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    if (openWebMode) {
      const acknowledged = window.confirm(
        'Open Web mode is enabled for this query. Continue with internet retrieval and linked citations?',
      )
      if (!acknowledged) return
    }

    setError(null)
    setInput('')

    addMessage({
      role: 'user',
      content: text,
      devotionalSlug,
      highlightedText: highlightedText || undefined,
    })

    setIsLoading(true)
    chatRequestAbortRef.current?.abort()
    const controller = new AbortController()
    chatRequestAbortRef.current = controller

    try {
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
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          devotionalSlug,
          highlightedText: highlightedText || undefined,
          brainMode: activeBrainMode,
          openWebMode,
          openWebAcknowledged: openWebMode,
          stream: true,
          userKeys: {
            openai: openaiApiKey || anthropicApiKey,
            google: googleApiKey,
            minimax: minimaxApiKey,
            nvidia_kimi: nvidiaKimiApiKey,
          },
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      if (
        response.ok &&
        contentType.includes('text/event-stream') &&
        response.body
      ) {
        const assistantMessageId = addMessage({
          role: 'assistant',
          content: '',
          devotionalSlug,
          citations: [],
          sourceCards: [],
        })
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let streamedText = ''
        let finalPayload: ChatApiResponse | null = null

        const consumeBlock = (block: string) => {
          const lines = block
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
          const eventLine = lines.find((line) => line.startsWith('event:'))
          const dataLine = lines.find((line) => line.startsWith('data:'))
          if (!eventLine || !dataLine) return

          const event = eventLine.replace(/^event:\s*/, '')
          const payloadRaw = dataLine.replace(/^data:\s*/, '')
          let parsed: ChatStreamEvent | null = null
          try {
            parsed = JSON.parse(payloadRaw) as ChatStreamEvent
          } catch {
            return
          }

          if (event === 'chunk' && parsed.event === 'chunk') {
            streamedText += parsed.delta || ''
            updateMessage(assistantMessageId, { content: streamedText })
          } else if (event === 'final' && parsed.event === 'final') {
            finalPayload = parsed.payload
          } else if (event === 'error' && parsed.event === 'error') {
            setError(parsed.error || 'Streaming response failed.')
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const segments = buffer.split('\n\n')
          buffer = segments.pop() || ''
          segments.forEach(consumeBlock)
        }
        if (buffer.trim()) {
          consumeBlock(buffer)
        }

        const resolvedPayload = finalPayload as ChatApiResponse | null
        if (resolvedPayload) {
          updateMessage(assistantMessageId, {
            content:
              resolvedPayload.message ||
              streamedText ||
              'I was not able to generate a response.',
            citations: Array.isArray(resolvedPayload.citations)
              ? resolvedPayload.citations
              : [],
            sourceCards: Array.isArray(resolvedPayload.sourceCards)
              ? resolvedPayload.sourceCards
              : [],
            guardrails: resolvedPayload.guardrails,
            brainProvider: resolvedPayload.brainProvider,
            retrievalMode: resolvedPayload.retrievalMode,
          })
          if (resolvedPayload.usage?.quotaState) {
            setQuotaState(resolvedPayload.usage.quotaState)
          }
        }
        return
      }

      const data = (await response.json()) as ChatApiResponse

      if (!response.ok) {
        setError(data.error || 'Something went wrong.')
        if (
          data.usage?.quotaState === 'halted_platform' ||
          data.usage?.quotaState === 'byo_required'
        ) {
          setQuotaState(data.usage.quotaState)
        }
        return
      }

      addMessage({
        role: 'assistant',
        content: data.message || 'I was not able to generate a response.',
        devotionalSlug,
        citations: Array.isArray(data.citations) ? data.citations : [],
        sourceCards: Array.isArray(data.sourceCards) ? data.sourceCards : [],
        guardrails: data.guardrails,
        brainProvider: data.brainProvider,
        retrievalMode: data.retrievalMode,
      })

      if (data.usage?.quotaState) {
        setQuotaState(data.usage.quotaState)
      }
    } catch {
      if (!controller.signal.aborted) {
        setError('Network error. Please check your connection.')
      }
    } finally {
      if (chatRequestAbortRef.current === controller) {
        chatRequestAbortRef.current = null
      }
      setIsLoading(false)
    }
  }, [
    input,
    isLoading,
    openWebMode,
    addMessage,
    devotionalSlug,
    highlightedText,
    contextMessages,
    activeBrainMode,
    openaiApiKey,
    anthropicApiKey,
    googleApiKey,
    minimaxApiKey,
    nvidiaKimiApiKey,
  ])

  const latestAssistantMessage = [...contextMessages]
    .reverse()
    .find((message) => message.role === 'assistant')
  const threadTrimmed = isThreadTrimmed(devotionalSlug)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => {
            setChatSidebarOpen(true)
            open()
          }}
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
              d="M7.5 9h9m-9 3h6m-7.5 9 1.5-4.5a8.25 8.25 0 1 1 3.586 3.586L7.5 21Z"
            />
          </svg>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close study chat"
              className="absolute inset-0 bg-black/30"
              onClick={() => {
                setChatSidebarOpen(false)
                close()
              }}
            />

            <motion.aside
              className="absolute right-0 top-0 h-full w-full max-w-[920px] border-l bg-[var(--color-bg)]"
              style={{ borderColor: 'var(--color-border)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="study-chat-title"
              tabIndex={-1}
              ref={dialogRef}
            >
              <div className="grid h-full grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
                <aside
                  className="hidden border-r px-3 py-4 md:block"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-3 text-gold">THREADS</p>
                  <div className="grid gap-2 overflow-y-auto">
                    {threadHistory.map((thread) => {
                      const active = thread.slug === devotionalSlug
                      return (
                        <button
                          key={thread.slug}
                          type="button"
                          onClick={() => {
                            router.push(routeFromThreadSlug(thread.slug))
                          }}
                          className="w-full border px-3 py-2 text-left"
                          style={{
                            borderColor: active
                              ? 'var(--color-border-strong)'
                              : 'var(--color-border)',
                            background: active
                              ? 'var(--color-active)'
                              : 'transparent',
                          }}
                        >
                          <p className="text-label vw-small text-gold">
                            {thread.title}
                          </p>
                          <p className="vw-small text-secondary">
                            {thread.excerpt}
                          </p>
                        </button>
                      )
                    })}
                    {threadHistory.length === 0 && (
                      <p className="vw-small text-muted">
                        No thread history yet.
                      </p>
                    )}
                  </div>
                </aside>

                <div className="flex h-full flex-col">
                  <header
                    className="border-b px-4 py-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-label vw-small text-gold">
                          <span id="study-chat-title">STUDY CHAT</span>
                        </p>
                        <p className="text-label vw-small text-gold sr-only">
                          STUDY CHAT
                        </p>
                        <p className="vw-small text-secondary">
                          {devotionalTitle || devotionalSlug}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setChatSidebarOpen(false)
                          close()
                        }}
                        className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
                      >
                        Close
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label
                        className="vw-small text-secondary"
                        htmlFor="chat-brain-mode"
                      >
                        Brain
                      </label>
                      <select
                        id="chat-brain-mode"
                        value={activeBrainMode}
                        onChange={(event) => {
                          const next = event.target.value as ProviderId
                          setThreadBrainMode(devotionalSlug, next)
                        }}
                        className="bg-surface-raised px-3 py-2 vw-small text-[var(--color-text-primary)]"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        {availableProviderModes.map((provider) => (
                          <option key={provider} value={provider}>
                            {PROVIDER_LABELS[provider]}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 vw-small text-secondary">
                        <input
                          type="checkbox"
                          checked={openWebMode}
                          onChange={(event) =>
                            setOpenWebMode(event.target.checked)
                          }
                        />
                        Open Web
                      </label>

                      {latestAssistantMessage?.retrievalMode === 'open_web' && (
                        <span className="text-label vw-small text-gold">
                          OPEN WEB MODE
                        </span>
                      )}
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {contextMessages.length === 0 && (
                      <div className="text-center py-10">
                        <p className="vw-small text-muted">
                          Ask about this day, your highlights, or Scripture
                          context.
                        </p>
                      </div>
                    )}

                    {contextMessages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        onToggleFavorite={toggleFavorite}
                        onSetColorLabel={(id: string, label: ChatColorLabel) =>
                          setColorLabel(id, label)
                        }
                        onSaveNote={(next) => void saveChatNote(next)}
                      />
                    ))}

                    {isLoading && (
                      <div className="mb-4 mr-8">
                        <div className="inline-block rounded-sm px-4 py-3 bg-surface-raised border border-[var(--color-border)]">
                          <p className="vw-small text-muted">Thinking...</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p className="vw-small mb-4 text-secondary">
                        {typographer(error)}
                      </p>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  <footer
                    className="border-t px-4 py-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {threadTrimmed && (
                      <p className="vw-small mb-2 text-muted">
                        Earlier messages in this thread were trimmed to keep
                        local storage stable.
                      </p>
                    )}
                    {quotaState === 'near_limit' && (
                      <p className="vw-small mb-2 text-secondary">
                        You are near the platform usage limit. Add BYO keys in
                        Settings for uninterrupted chat.
                      </p>
                    )}
                    {(quotaState === 'halted_platform' ||
                      quotaState === 'byo_required') && (
                      <p className="vw-small mb-2 text-secondary">
                        Platform chat cap reached. Add BYO keys in Settings or
                        switch to a BYO-enabled provider.
                      </p>
                    )}

                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about this devotional..."
                      disabled={isLoading}
                      rows={3}
                      className="w-full bg-surface-raised px-4 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                      style={{ border: '1px solid var(--color-border)' }}
                    />

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="vw-small text-muted">
                        {openWebMode
                          ? 'Open Web mode on: requires per-query acknowledgement.'
                          : 'Closed RAG mode: local corpus grounding only.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={isLoading || input.trim().length === 0}
                        className="bg-[var(--color-fg)] px-6 py-2 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
