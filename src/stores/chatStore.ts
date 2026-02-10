import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatColorLabel } from '@/types'

interface ChatState {
  /** All chat messages (persistent history) */
  messages: ChatMessage[]
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

  open: (highlightedText?: string) => void
  close: () => void
  setDevotionalContext: (slug: string | null) => void
  addMessage: (
    message: Omit<ChatMessage, 'id' | 'createdAt' | 'favorited' | 'colorLabel'>,
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
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      highlightedText: null,
      currentDevotionalSlug: null,
      dailyMessageCount: 0,
      dailyCountDate: todayString(),

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
        set({ messages: [...get().messages, message] })
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
        set({ messages: [] })
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
    }),
    {
      name: 'euangelion-chat',
      partialize: (state) => ({
        messages: state.messages,
        dailyMessageCount: state.dailyMessageCount,
        dailyCountDate: state.dailyCountDate,
      }),
    },
  ),
)
