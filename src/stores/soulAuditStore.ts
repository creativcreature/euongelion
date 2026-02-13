import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SoulAuditState {
  /** Number of audits taken */
  auditCount: number
  /** Most recent audit results */
  lastResults: unknown | null
  /** The user's most recent audit text */
  lastInput: string | null

  recordAudit: (input: string, results: unknown) => void
  clearResults: () => void
  resetAudit: () => void
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

      resetAudit: () => {
        set({ auditCount: 0, lastResults: null, lastInput: null })
      },

      hasReachedLimit: () => {
        return get().auditCount >= MAX_AUDITS
      },
    }),
    {
      name: 'euangelion-soul-audit',
      partialize: (state) => ({ auditCount: state.auditCount }),
    },
  ),
)
