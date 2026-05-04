'use client'

import { useEffect, useState } from 'react'

/**
 * useActivePlan
 *
 * Lightweight client-side hook that fetches /api/soul-audit/current and
 * exposes the user's currently-active plan (Soul Audit AI plan or curated
 * series selection). Mirrors the simple useState + useEffect pattern used
 * by other hooks in src/hooks/ (no Zustand store added — anti-sprawl).
 *
 * Module-level cache deduplicates fetches across multiple mounts so the
 * header badge, /series tile, etc. share one network round-trip per
 * navigation. The cache is invalidated on `soulAuditPlanChanged` window
 * events (emitted by select / reset flows).
 */

export interface ActivePlan {
  route: string
  selectionType: 'ai_primary' | 'ai_generative' | 'curated_prefab'
  planToken?: string
  seriesSlug?: string
  seriesTitle?: string
  dayNumber?: number
}

export interface ActivePlanState {
  active: ActivePlan | null
  loading: boolean
}

type CachedResponse = {
  hasCurrent: boolean
  active: ActivePlan | null
}

let cachedResponse: CachedResponse | null = null
let inflight: Promise<CachedResponse> | null = null

async function fetchActivePlan(): Promise<CachedResponse> {
  if (cachedResponse) return cachedResponse
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch('/api/soul-audit/current', {
        method: 'GET',
        credentials: 'include',
      })
      if (!res.ok) {
        cachedResponse = { hasCurrent: false, active: null }
        return cachedResponse
      }
      const data = (await res.json()) as {
        hasCurrent?: boolean
        route?: string
        selectionType?: ActivePlan['selectionType']
        planToken?: string
        seriesSlug?: string
        seriesTitle?: string
        dayNumber?: number
      }
      if (!data.hasCurrent || !data.route || !data.selectionType) {
        cachedResponse = { hasCurrent: false, active: null }
      } else {
        cachedResponse = {
          hasCurrent: true,
          active: {
            route: data.route,
            selectionType: data.selectionType,
            planToken: data.planToken,
            seriesSlug: data.seriesSlug,
            seriesTitle: data.seriesTitle,
            dayNumber: data.dayNumber,
          },
        }
      }
      return cachedResponse
    } catch {
      cachedResponse = { hasCurrent: false, active: null }
      return cachedResponse
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** Force the next call to refetch from the network. */
export function invalidateActivePlanCache(): void {
  cachedResponse = null
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('soulAuditPlanChanged'))
  }
}

export function useActivePlan(): ActivePlanState {
  const [state, setState] = useState<ActivePlanState>({
    active: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    const load = () => {
      void fetchActivePlan().then((result) => {
        if (!mounted) return
        setState({ active: result.active, loading: false })
      })
    }

    const handleInvalidate = () => {
      cachedResponse = null
      load()
    }

    load()
    window.addEventListener('soulAuditPlanChanged', handleInvalidate)
    return () => {
      mounted = false
      window.removeEventListener('soulAuditPlanChanged', handleInvalidate)
    }
  }, [])

  return state
}
