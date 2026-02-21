import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatColorLabel } from '@/types'

type BrainMode = 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'

interface ChatState {
  /** All chat messages (persistent history) */
  messages: ChatMessage[]
  /** Threads that have been trimmed due to history cap */
  trimmedThreadSlugs: string[]
  /** Whether the chat modal is open */
  isOpen: boolean
  /** Highlighted text that triggered the chat (transient) */
  highlightedText: string | null
  /** Current devotional context (transient) */
  currentDevotionalSlug: string | null
  /** Free-tier daily message count */
  dailyMessageCount: number
  /** Date string for daily count reset */
  dailyCountDate: string
  /** Per-thread brain override (devotional slug keyed) */
  threadBrainModeBySlug: Record<string, BrainMode>

  open: (highlightedText?: string) => void
  close: () => void
  setDevotionalContext: (slug: string | null) => void
  addMessage: (
    message: Omit<ChatMessage, 'id' | 'createdAt' | 'favorited' | 'colorLabel'>,
  ) => string
  updateMessage: (
    messageId: string,
    patch: Partial<
      Omit<ChatMessage, 'id' | 'createdAt' | 'devotionalSlug' | 'role'>
    >,
  ) => void
  toggleFavorite: (messageId: string) => void
  setColorLabel: (messageId: string, label: ChatColorLabel) => void
  clearHistory: () => void
  getFilteredMessages: (filter: {
    favorited?: boolean
    colorLabel?: ChatColorLabel
    devotionalSlug?: string
  }) => ChatMessage[]
  incrementDailyCount: () => void
  getDailyCount: () => number
  setThreadBrainMode: (devotionalSlug: string, mode: BrainMode) => void
  getThreadBrainMode: (devotionalSlug: string) => BrainMode | null
  isThreadTrimmed: (devotionalSlug: string) => boolean
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

const MAX_MESSAGES_PER_THREAD = 100

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      trimmedThreadSlugs: [],
      isOpen: false,
      highlightedText: null,
      currentDevotionalSlug: null,
      dailyMessageCount: 0,
      dailyCountDate: todayString(),
      threadBrainModeBySlug: {},

      open: (highlightedText) => {
        set({ isOpen: true, highlightedText: highlightedText || null })
      },

      close: () => {
        set({ isOpen: false, highlightedText: null })
      },

      setDevotionalContext: (slug) => {
        set({ currentDevotionalSlug: slug })
      },

      addMessage: (partial) => {
        const message: ChatMessage = {
          id: generateId(),
          createdAt: new Date().toISOString(),
          favorited: false,
          colorLabel: 'none',
          ...partial,
        }
        const current = get()
        const nextMessages = [...current.messages, message]
        const slug = message.devotionalSlug
        if (!slug) {
          set({ messages: nextMessages })
          return message.id
        }

        const threadMessages = nextMessages.filter(
          (m) => m.devotionalSlug === slug,
        )
        if (threadMessages.length <= MAX_MESSAGES_PER_THREAD) {
          set({ messages: nextMessages })
          return message.id
        }

        const overflow = threadMessages.length - MAX_MESSAGES_PER_THREAD
        const toDrop = new Set(
          threadMessages.slice(0, overflow).map((entry) => entry.id),
        )
        const trimmedMessages = nextMessages.filter(
          (entry) => !toDrop.has(entry.id),
        )
        const trimmedThreadSlugs = Array.from(
          new Set([...current.trimmedThreadSlugs, slug]),
        )
        set({
          messages: trimmedMessages,
          trimmedThreadSlugs,
        })
        return message.id
      },

      updateMessage: (messageId, patch) => {
        set({
          messages: get().messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message,
          ),
        })
      },

      toggleFavorite: (messageId) => {
        set({
          messages: get().messages.map((m) =>
            m.id === messageId ? { ...m, favorited: !m.favorited } : m,
          ),
        })
      },

      setColorLabel: (messageId, label) => {
        set({
          messages: get().messages.map((m) =>
            m.id === messageId ? { ...m, colorLabel: label } : m,
          ),
        })
      },

      clearHistory: () => {
        set({ messages: [], trimmedThreadSlugs: [] })
      },

      getFilteredMessages: (filter) => {
        return get().messages.filter((m) => {
          if (filter.favorited && !m.favorited) return false
          if (
            filter.colorLabel &&
            filter.colorLabel !== 'none' &&
            m.colorLabel !== filter.colorLabel
          )
            return false
          if (
            filter.devotionalSlug &&
            m.devotionalSlug !== filter.devotionalSlug
          )
            return false
          return true
        })
      },

      incrementDailyCount: () => {
        const today = todayString()
        const { dailyCountDate, dailyMessageCount } = get()
        if (dailyCountDate !== today) {
          set({ dailyMessageCount: 1, dailyCountDate: today })
        } else {
          set({ dailyMessageCount: dailyMessageCount + 1 })
        }
      },

      getDailyCount: () => {
        const today = todayString()
        const { dailyCountDate, dailyMessageCount } = get()
        if (dailyCountDate !== today) return 0
        return dailyMessageCount
      },

      setThreadBrainMode: (devotionalSlug, mode) => {
        if (!devotionalSlug) return
        set({
          threadBrainModeBySlug: {
            ...get().threadBrainModeBySlug,
            [devotionalSlug]: mode,
          },
        })
      },

      getThreadBrainMode: (devotionalSlug) => {
        if (!devotionalSlug) return null
        return get().threadBrainModeBySlug[devotionalSlug] || null
      },
      isThreadTrimmed: (devotionalSlug) => {
        if (!devotionalSlug) return false
        return get().trimmedThreadSlugs.includes(devotionalSlug)
      },
    }),
    {
      name: 'euangelion-chat',
      partialize: (state) => ({
        messages: state.messages,
        trimmedThreadSlugs: state.trimmedThreadSlugs,
        dailyMessageCount: state.dailyMessageCount,
        dailyCountDate: state.dailyCountDate,
        threadBrainModeBySlug: state.threadBrainModeBySlug,
      }),
    },
  ),
)
