import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DevotionalProgress } from '@/types'

interface ProgressState {
  /** Completed devotional slugs with timestamps */
  completions: DevotionalProgress[]
  /** Series start dates (for day-gating) */
  seriesStartDates: Record<string, string>

  markComplete: (slug: string, timeSpent?: number) => void
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

      markComplete: (slug, timeSpent) => {
        const { completions } = get()
        if (completions.some((p) => p.slug === slug)) return

        set({
          completions: [
            ...completions,
            { slug, completedAt: new Date().toISOString(), timeSpent },
          ],
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
        const { seriesStartDates } = get()
        if (seriesStartDates[seriesSlug]) return

        set({
          seriesStartDates: {
            ...seriesStartDates,
            [seriesSlug]: new Date().toISOString(),
          },
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
