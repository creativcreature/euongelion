/**
 * The Daily Bread V2 health surface (SA-142 / F-184): is today's paper
 * published, is tomorrow's on track, how have recent attempts gone, what did
 * they cost. Read-only; used by the protected health endpoint, the CLI and the
 * scheduler's alert step.
 */
import type { DailyBreadRepository } from './repository/types'
import { addDays, rolloverInstant, schedulePlan, type EditorialClock } from './time'
import type { EditionLifecycle, PublicationAttempt } from './types'

export interface DailyBreadHealth {
  status: 'ok' | 'degraded' | 'down'
  checkedAt: string
  live: {
    date: string
    lifecycle: EditionLifecycle | null
    quality?: string
    issue?: number | null
    showing?: string
  }
  next: { date: string; lifecycle: EditionLifecycle | null; rollover: string }
  lastAttempt?: {
    targetDate: string
    stage: string
    result?: string
    completedAt?: string
    primaryProvider?: string
    fallbackProvidersUsed: string[]
    errorCount: number
  }
  consecutiveFailures: number
  window7d: {
    attempts: number
    failures: number
    fallbackOrMinimum: number
    deterministicFrames: number
    estimatedCostUsd: number
  }
  alerts: string[]
}

/** Grace after rollover before a missing paper is "down" (scheduler delay). */
export const DOWN_AFTER_MINUTES = 90
export const NEXT_READY_BY_MINUTES = 120

export async function getDailyBreadHealth(
  repo: DailyBreadRepository,
  clock: EditorialClock,
): Promise<DailyBreadHealth> {
  const now = clock.now()
  const plan = schedulePlan(clock)
  const [liveLifecycle, nextLifecycle, attempts, latest] = await Promise.all([
    repo.getLifecycle(plan.liveDate),
    repo.getLifecycle(plan.nextDate),
    repo.recentAttempts(60),
    repo.getLatestPublished(plan.liveDate),
  ])
  const liveEdition = latest?.editionDate === plan.liveDate ? latest : null

  const weekAgo = addDays(plan.liveDate, -7)
  const window = attempts.filter((a) => a.targetDate >= weekAgo)
  let consecutiveFailures = 0
  for (const a of attempts) {
    if (a.publicationResult === 'failed') consecutiveFailures += 1
    else if (a.publicationResult === 'ready' || a.publicationResult === 'published') break
  }

  const alerts: string[] = []
  const liveRollover = rolloverInstant(plan.liveDate)
  const minutesSinceRollover = (now.getTime() - liveRollover.getTime()) / 60_000
  const livePublished = liveLifecycle === 'published' || liveLifecycle === 'superseded'
  let status: DailyBreadHealth['status'] = 'ok'

  if (!livePublished) {
    if (minutesSinceRollover > DOWN_AFTER_MINUTES) {
      status = 'down'
      alerts.push(
        `Today's edition (${plan.liveDate}) is ${liveLifecycle ?? 'missing'} ${Math.round(minutesSinceRollover)} minutes after rollover.`,
      )
    } else {
      status = 'degraded'
      alerts.push(`Today's edition (${plan.liveDate}) is not published yet (${liveLifecycle ?? 'missing'}).`)
    }
  } else if (liveEdition && liveEdition.quality !== 'normal') {
    status = 'degraded'
    alerts.push(`Today's edition was published at ${liveEdition.quality} quality.`)
  }

  const minutesToNext = (plan.nextRollover.getTime() - now.getTime()) / 60_000
  if (
    minutesToNext < NEXT_READY_BY_MINUTES &&
    nextLifecycle !== 'ready' &&
    nextLifecycle !== 'published'
  ) {
    if (status === 'ok') status = 'degraded'
    alerts.push(
      `Tomorrow's edition (${plan.nextDate}) is ${nextLifecycle ?? 'missing'} with ${Math.round(minutesToNext)} minutes to rollover.`,
    )
  }
  if (consecutiveFailures >= 2) {
    if (status === 'ok') status = 'degraded'
    alerts.push(`${consecutiveFailures} consecutive failed attempts.`)
  }

  const last: PublicationAttempt | undefined = attempts[0]
  return {
    status,
    checkedAt: now.toISOString(),
    live: {
      date: plan.liveDate,
      lifecycle: liveLifecycle,
      quality: liveEdition?.quality,
      issue: liveEdition?.issue,
      showing: latest?.editionDate,
    },
    next: { date: plan.nextDate, lifecycle: nextLifecycle, rollover: plan.nextRollover.toISOString() },
    ...(last
      ? {
          lastAttempt: {
            targetDate: last.targetDate,
            stage: last.lifecycleStage,
            result: last.publicationResult,
            completedAt: last.completedAt,
            primaryProvider: last.primaryProvider,
            fallbackProvidersUsed: last.fallbackProvidersUsed,
            errorCount: last.errors.length,
          },
        }
      : {}),
    consecutiveFailures,
    window7d: {
      attempts: window.length,
      failures: window.filter((a) => a.publicationResult === 'failed').length,
      fallbackOrMinimum: window.filter((a) => a.quality === 'fallback' || a.quality === 'minimum').length,
      deterministicFrames: window.filter((a) => a.fallbackProvidersUsed.includes('deterministic')).length,
      estimatedCostUsd: Number(window.reduce((s, a) => s + a.estimatedCostUsd, 0).toFixed(4)),
    },
    alerts,
  }
}
