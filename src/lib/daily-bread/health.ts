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
  /** Plan §69: the newest published paper (any date). */
  latestPublished: { date: string; issue: number | null; quality: string } | null
  /** Plan §69: where the most recent failure happened. */
  latestFailure?: { targetDate: string; stage: string; message: string; at?: string }
  /** Plan §69: what the most recent frame generation says about the providers. */
  providers: {
    claude: 'ok' | 'failing' | 'not configured' | 'unknown'
    claudeDetail?: string
    secondary: 'configured' | 'not configured' | 'unknown'
  }
  /** Plan §70: the worst alert raised. The CLI exits 1 on critical, which files an issue. */
  alertLevel: 'none' | 'warning' | 'critical'
  critical: string[]
  warnings: string[]
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

  const critical: string[] = []
  const warnings: string[] = []
  const liveRollover = rolloverInstant(plan.liveDate)
  const minutesSinceRollover = (now.getTime() - liveRollover.getTime()) / 60_000
  const livePublished = liveLifecycle === 'published' || liveLifecycle === 'superseded'
  let status: DailyBreadHealth['status'] = 'ok'

  if (!livePublished) {
    if (minutesSinceRollover > DOWN_AFTER_MINUTES) {
      status = 'down'
      critical.push(
        `Today's edition (${plan.liveDate}) is ${liveLifecycle ?? 'missing'} ${Math.round(minutesSinceRollover)} minutes after rollover.`,
      )
    } else {
      status = 'degraded'
      warnings.push(`Today's edition (${plan.liveDate}) is not published yet (${liveLifecycle ?? 'missing'}).`)
    }
  } else if (liveEdition && liveEdition.quality !== 'normal') {
    status = 'degraded'
    warnings.push(`Today's edition was published at ${liveEdition.quality} quality.`)
  }

  const minutesToNext = (plan.nextRollover.getTime() - now.getTime()) / 60_000
  if (
    minutesToNext < NEXT_READY_BY_MINUTES &&
    nextLifecycle !== 'ready' &&
    nextLifecycle !== 'published'
  ) {
    if (status === 'ok') status = 'degraded'
    critical.push(
      `No issue ready before the deadline: tomorrow's edition (${plan.nextDate}) is ${nextLifecycle ?? 'missing'} with ${Math.round(minutesToNext)} minutes to rollover.`,
    )
  }
  if (consecutiveFailures >= 2) {
    if (status === 'ok') status = 'degraded'
    critical.push(`Publication failing: ${consecutiveFailures} consecutive failed attempts.`)
  }
  const failedAttempt = attempts.find((a) => a.publicationResult === 'failed')
  if (failedAttempt && failedAttempt === attempts[0] && failedAttempt.lifecycleStage.startsWith('published')) {
    critical.push(`The database publication transaction failed for ${failedAttempt.targetDate}: ${failedAttempt.errors[0]?.message ?? 'no message'}.`)
  }
  // A lease refused because another job is assembling the same date, again and again.
  const duplicates = new Map<string, number>()
  for (const a of window) if (a.lifecycleStage === 'lease:assembling') duplicates.set(a.targetDate, (duplicates.get(a.targetDate) ?? 0) + 1)
  for (const [date, n] of duplicates) {
    if (n >= 3) critical.push(`Duplicate edition attempts for ${date}: ${n} jobs found it already assembling.`)
  }

  // Plan §69–70: provider state from the most recent frame generation.
  const frameAttempt = attempts.find((a) => a.providerUsage.some((u) => u.task === 'editorial-frame'))
  const frameUsage = frameAttempt?.providerUsage.filter((u) => u.task === 'editorial-frame') ?? []
  const claudeUsage = frameUsage.filter((u) => u.provider === 'claude-cli' || u.provider === 'claude-api')
  const configured = (u: { error?: string }) => !u.error?.startsWith('unavailable')
  const claudeOk = claudeUsage.some((u) => u.ok)
  const providers: DailyBreadHealth['providers'] = {
    claude: !frameAttempt
      ? 'unknown'
      : claudeOk
        ? 'ok'
        : claudeUsage.some(configured)
          ? 'failing'
          : 'not configured',
    ...(frameAttempt && !claudeOk
      ? { claudeDetail: claudeUsage.map((u) => `${u.provider}: ${u.error ?? 'failed'}`).join('; ') }
      : {}),
    secondary: !frameAttempt
      ? 'unknown'
      : frameUsage.some((u) => (u.provider === 'openai' || u.provider === 'gemini') && configured(u))
        ? 'configured'
        : 'not configured',
  }
  if (frameAttempt && !claudeOk && frameUsage.some((u) => u.ok && u.provider !== 'deterministic')) {
    warnings.push(`Claude failed and the backup wrote the frame (${frameAttempt.targetDate}).`)
  }
  const secondaryFailed = frameUsage.filter((u) => (u.provider === 'openai' || u.provider === 'gemini') && configured(u) && !u.ok)
  if (secondaryFailed.length > 0) {
    warnings.push(`The secondary provider failed (${secondaryFailed.map((u) => `${u.provider}: ${u.error ?? 'failed'}`).join('; ')}).`)
  }
  const lastBuild = attempts.find((a) => a.lifecycleStage === 'ready' || a.publicationResult === 'ready')
  if (lastBuild?.assetFallbacks.some((f) => f === 'comic: omitted')) {
    warnings.push(`The comic was omitted from ${lastBuild.targetDate}.`)
  }
  const alerts = [...critical, ...warnings]

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
    latestPublished: latest ? { date: latest.editionDate, issue: latest.issue, quality: latest.quality } : null,
    ...(failedAttempt
      ? {
          latestFailure: {
            targetDate: failedAttempt.targetDate,
            stage: failedAttempt.errors[0]?.stage ?? failedAttempt.lifecycleStage,
            message: failedAttempt.errors[0]?.message ?? '',
            at: failedAttempt.completedAt,
          },
        }
      : {}),
    providers,
    alertLevel: critical.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'none',
    critical,
    warnings,
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
