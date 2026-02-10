import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuditMatch {
  slug: string
  title: string
  question: string
  confidence: number
  reasoning: string
  preview?: { verse: string; paragraph: string }
}

interface SoulAuditState {
  /** Number of audits taken */
  auditCount: number
  /** Most recent audit results */
  lastResults: { matches: AuditMatch[] } | null
  /** The user's most recent audit text */
  lastInput: string | null

  recordAudit: (input: string, results: { matches: AuditMatch[] }) => void
  clearResults: () => void
  hasReachedLimit: () => boolean
}

const MAX_AUDITS = 3

export const useSoulAuditStore = create<SoulAuditState>()(
  persist(
    (set, get) => ({
      auditCount: 0,
      lastResults: null,
      lastInput: null,

      recordAudit: (input, results) => {
        set({
          auditCount: get().auditCount + 1,
          lastResults: results,
          lastInput: input,
        })
      },

      clearResults: () => {
        set({ lastResults: null, lastInput: null })
      },

      hasReachedLimit: () => {
        return get().auditCount >= MAX_AUDITS
      },
    }),
    {
      name: 'euangelion-soul-audit',
    },
  ),
)
