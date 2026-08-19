import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DevotionalProgress } from '@/types'
import { unionCompletions } from '@/lib/reading/completion-merge'

interface ProgressState {
  /** Completed devotional slugs with timestamps */
  completions: DevotionalProgress[]
  /** Series start dates (for day-gating) */
  seriesStartDates: Record<string, string>
  /**
   * The account these completions last synced with; null until the first
   * signed-in sync. Persisted with the store, because it exists for the visit
   * AFTER a sign-out: on a shared device, a different account signing in must
   * find the previous owner's stamp and refuse to inherit their history.
   */
  syncOwnerId: string | null

  markComplete: (slug: string, timeSpent?: number) => void
  /**
   * Fold in completions recorded on the reader's account.
   *
   * A union in both directions, never a replace: this device may hold days the
   * account has not been told about yet, and the sync layer pushes those up
   * rather than the merge quietly dropping them.
   */
  mergeRemoteCompletions: (rows: readonly DevotionalProgress[]) => void
  /** Claim or confirm which account this device's progress belongs to. */
  stampSyncOwner: (userId: string) => void
  /**
   * A DIFFERENT account signed in on this device. The one case where union is
   * wrong: the previous reader's completions must not leak into this account,
   * so the server state wins outright and the owner stamp moves with it.
   */
  replaceCompletions: (
    rows: readonly DevotionalProgress[],
    userId: string,
  ) => void
  isComplete: (slug: string) => boolean
  getSeriesProgress: (slugs: string[]) => { completed: number; total: number }
  startSeries: (seriesSlug: string) => void
  getSeriesStartDate: (seriesSlug: string) => string | null
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completions: [],
      seriesStartDates: {},
      syncOwnerId: null,

      markComplete: (slug, timeSpent) => {
        set((state) => {
          if (state.completions.some((p) => p.slug === slug)) {
            return state
          }
          return {
            completions: [
              ...state.completions,
              { slug, completedAt: new Date().toISOString(), timeSpent },
            ],
          }
        })
      },

      mergeRemoteCompletions: (rows) => {
        set((state) => {
          const merged = unionCompletions(state.completions, rows)
          // Identity is preserved when nothing changed, so the rails that
          // subscribe to `completions` do not re-render on every app load.
          if (merged.length === state.completions.length) {
            const known = new Set(state.completions.map((p) => p.slug))
            if (merged.every((p) => known.has(p.slug))) return state
          }
          return { completions: merged }
        })
      },

      stampSyncOwner: (userId) => {
        set((state) =>
          state.syncOwnerId === userId ? state : { syncOwnerId: userId },
        )
      },

      replaceCompletions: (rows, userId) => {
        set({
          completions: rows.map((row) => ({ ...row })),
          syncOwnerId: userId,
        })
      },

      isComplete: (slug) => {
        return get().completions.some((p) => p.slug === slug)
      },

      getSeriesProgress: (slugs) => {
        const { completions } = get()
        const completed = slugs.filter((s) =>
          completions.some((p) => p.slug === s),
        ).length
        return { completed, total: slugs.length }
      },

      startSeries: (seriesSlug) => {
        set((state) => {
          if (state.seriesStartDates[seriesSlug]) return state
          return {
            seriesStartDates: {
              ...state.seriesStartDates,
              [seriesSlug]: new Date().toISOString(),
            },
          }
        })
      },

      getSeriesStartDate: (seriesSlug) => {
        return get().seriesStartDates[seriesSlug] || null
      },
    }),
    {
      name: 'euangelion-progress',
    },
  ),
)
