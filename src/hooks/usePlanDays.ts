'use client'

/**
 * usePlanDays — Shared hook for fetching and caching plan days.
 *
 * Extracted from the monolithic results page (Phase 6) so both the
 * selection page and the reader page can share plan-loading logic.
 *
 * Responsibilities:
 * - Fetch days 1-5 (+ day 0 for onboarding) from /api/devotional-plan/[token]/day/[n]
 * - Separate unlocked days from locked previews
 * - Cache plan days in sessionStorage for offline resilience
 * - Provide loading/error state
 */

import { useCallback, useState } from 'react'
import type { CustomPlanDay, PlanOnboardingMeta } from '@/types/soul-audit'
import { isFullPlanDay } from '@/lib/soul-audit/type-guards'

type PlanDayPreview = Pick<
  CustomPlanDay,
  'day' | 'title' | 'scriptureReference' | 'scriptureText'
>

type PlanDayResponse = {
  locked: boolean
  archived: boolean
  onboarding: boolean
  message?: string
  day?: CustomPlanDay | PlanDayPreview | null
  schedule?: PlanOnboardingMeta & {
    dayLocking?: 'enabled' | 'disabled'
  }
}

const PLAN_CACHE_PREFIX = 'soul-audit-plan-v2:'

function isPlanPreview(day: unknown): day is PlanDayPreview {
  if (!day || typeof day !== 'object') return false
  const candidate = day as Record<string, unknown>
  return (
    typeof candidate.day === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.reflection !== 'string'
  )
}

function loadCachedPlanDays(token: string): CustomPlanDay[] {
  try {
    const raw = sessionStorage.getItem(`${PLAN_CACHE_PREFIX}${token}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFullPlanDay)
  } catch {
    return []
  }
}

function persistPlanDays(token: string, days: CustomPlanDay[]): void {
  try {
    sessionStorage.setItem(
      `${PLAN_CACHE_PREFIX}${token}`,
      JSON.stringify(days),
    )
  } catch {
    // sessionStorage quota exceeded — ignore
  }
}

export interface UsePlanDaysResult {
  planDays: CustomPlanDay[]
  lockedDayPreviews: PlanDayPreview[]
  lockedMessages: string[]
  planOnboardingMeta: PlanOnboardingMeta | null
  loadingPlan: boolean
  error: string | null
  loadPlan: (token: string) => Promise<void>
}

export function usePlanDays(): UsePlanDaysResult {
  const [planDays, setPlanDays] = useState<CustomPlanDay[]>([])
  const [lockedDayPreviews, setLockedDayPreviews] = useState<PlanDayPreview[]>(
    [],
  )
  const [lockedMessages, setLockedMessages] = useState<string[]>([])
  const [planOnboardingMeta, setPlanOnboardingMeta] =
    useState<PlanOnboardingMeta | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPlan = useCallback(async (token: string) => {
    setLoadingPlan(true)
    setError(null)

    try {
      const cachedPlanDays = loadCachedPlanDays(token)
      const requests = [1, 2, 3, 4, 5].map(async (day) => {
        const response = await fetch(
          `/api/devotional-plan/${token}/day/${day}?preview=1`,
        )
        const payload = (await response.json()) as PlanDayResponse
        return { day, status: response.status, payload }
      })

      const responses = await Promise.all(requests)
      const unlockedDays: CustomPlanDay[] = []
      const lockedPreviews: PlanDayPreview[] = []
      const locks: string[] = []
      let resolvedSchedule: PlanOnboardingMeta | null = null

      for (const entry of responses) {
        if (!resolvedSchedule && entry.payload.schedule) {
          resolvedSchedule = entry.payload.schedule
        }
        if (entry.status === 200 && entry.payload.day) {
          if (entry.payload.locked && isPlanPreview(entry.payload.day)) {
            lockedPreviews.push(entry.payload.day)
          } else if (
            !entry.payload.locked &&
            isFullPlanDay(entry.payload.day)
          ) {
            unlockedDays.push(entry.payload.day)
          }
        }
        if (entry.status === 423 && entry.payload.message) {
          locks.push(entry.payload.message)
        }
        if (
          entry.status === 200 &&
          entry.payload.locked &&
          entry.payload.message
        ) {
          locks.push(entry.payload.message)
        }
      }

      // Wed-Sun onboarding mode: day 0 exists before Monday cycle unlocks.
      if (unlockedDays.length === 0) {
        const onboardingResponse = await fetch(
          `/api/devotional-plan/${token}/day/0`,
        )
        if (onboardingResponse.status === 200) {
          const onboardingPayload =
            (await onboardingResponse.json()) as PlanDayResponse
          if (!resolvedSchedule && onboardingPayload.schedule) {
            resolvedSchedule = onboardingPayload.schedule
          }
          if (isFullPlanDay(onboardingPayload.day)) {
            unlockedDays.push(onboardingPayload.day)
          }
        }
      }

      unlockedDays.sort((a, b) => a.day - b.day)
      lockedPreviews.sort((a, b) => a.day - b.day)
      const resolvedPlanDays =
        unlockedDays.length > 0 ? unlockedDays : cachedPlanDays
      setPlanDays(resolvedPlanDays)
      setLockedDayPreviews(lockedPreviews)
      setLockedMessages(Array.from(new Set(locks)))
      if (resolvedSchedule) {
        setPlanOnboardingMeta(resolvedSchedule)
      }
      if (resolvedPlanDays.length > 0) {
        persistPlanDays(token, resolvedPlanDays)
      }
    } catch (err) {
      const cachedPlanDays = loadCachedPlanDays(token)
      if (cachedPlanDays.length > 0) {
        setPlanDays(cachedPlanDays)
        setLockedDayPreviews([])
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load your devotional plan.',
        )
      }
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  return {
    planDays,
    lockedDayPreviews,
    lockedMessages,
    planOnboardingMeta,
    loadingPlan,
    error,
    loadPlan,
  }
}
