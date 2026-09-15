/**
 * Publication and attempt bookkeeping — kept apart from the builder so a
 * Workers route can publish (a fast database transaction) without bundling
 * the Node-only module builders and providers.
 */
import type { RunLogger } from './log'
import { errorMessage } from './redact'
import type { DailyBreadRepository } from './repository/types'
import { rolloverInstant, type EditorialClock } from './time'
import type { PublicationAttempt } from './types'

export interface PublishDeps {
  repo: DailyBreadRepository
  clock: EditorialClock
  logger: RunLogger
  trigger: PublicationAttempt['trigger']
  /** Returns the subset of edition_items ids that are now rejected. */
  rejectedSourceItems?: (ids: string[]) => Promise<string[]>
}

export interface PublishOutcome {
  result:
    | 'published'
    | 'already_published'
    | 'not_ready'
    | 'missing'
    | 'too_early'
    | 'rebuild_required'
    | 'failed'
  issue?: number | null
  volume?: number | null
  reason?: string
}

export function newAttempt(
  deps: Pick<PublishDeps, 'clock' | 'logger' | 'trigger'>,
  dateSlug: string,
  stage: string,
): PublicationAttempt {
  return {
    attemptId: crypto.randomUUID(),
    targetDate: dateSlug,
    runId: deps.logger.runId,
    trigger: deps.trigger,
    startedAt: deps.clock.now().toISOString(),
    lifecycleStage: stage,
    fallbackProvidersUsed: [],
    errors: [],
    warnings: [],
    moduleFailures: [],
    assetFallbacks: [],
    stageTimings: [],
    providerUsage: [],
    estimatedCostUsd: 0,
  }
}

export async function finishAttempt(
  deps: Pick<PublishDeps, 'clock' | 'logger' | 'repo'>,
  attempt: PublicationAttempt,
) {
  attempt.completedAt = deps.clock.now().toISOString()
  attempt.stageTimings = deps.logger.timings()
  attempt.estimatedCostUsd = attempt.providerUsage.reduce((s, u) => s + (u.estimatedCostUsd ?? 0), 0)
  // Plan §66: one structured line per attempt with the identifiers an operator
  // searches by. Redacted like every log line; no secrets, no reader data.
  const failed = attempt.publicationResult === 'failed'
  deps.logger[failed ? 'warn' : 'info']('attempt_completed', {
    target_date: attempt.targetDate,
    attempt_id: attempt.attemptId ?? null,
    edition_id: attempt.editionId ?? null,
    issue_number: attempt.issue ?? null,
    stage: attempt.lifecycleStage,
    provider: attempt.frameProvider ?? null,
    fallback_level: attempt.fallbackLevel ?? null,
    quality: attempt.quality ?? null,
    duration_ms: Math.max(0, Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt)),
    result: attempt.publicationResult ?? null,
    ...(failed ? { failed_stage: attempt.errors[0]?.stage ?? attempt.lifecycleStage, error: attempt.errors[0]?.message ?? null } : {}),
  })
  try {
    await deps.repo.recordAttempt(attempt)
  } catch (error) {
    // The attempt log is observability, not the paper: a failed write is
    // logged loudly (the health check then shows the gap), never thrown over
    // the real outcome.
    deps.logger.error('attempt_record_failed', error, { targetDate: attempt.targetDate })
  }
}

/**
 * Plan §28 step 34: one structured success event per publication, carrying the
 * numbers an operator watches (serial, quality, fallback level, how late after
 * the 7am rollover). The repo has no metrics backend; logs are the metric. A
 * failure to read the edition back is logged, never allowed to undo a
 * publication that already committed.
 */
async function logPublishedMetrics(deps: PublishDeps, dateSlug: string, now: Date): Promise<void> {
  try {
    const edition = await deps.repo.getEdition(dateSlug)
    deps.logger.info('edition_published', {
      dateSlug,
      issue: edition?.issue ?? null,
      volume: edition?.volume ?? null,
      quality: edition?.quality ?? null,
      fallbackLevel: edition?.generation.fallbackLevel ?? null,
      frameProvider: edition?.generation.provider ?? null,
      comicLevel: edition?.generation.comicLevel ?? null,
      moduleFailures: edition?.generation.moduleFailures.length ?? null,
      secondsAfterRollover: Math.round((now.getTime() - rolloverInstant(dateSlug).getTime()) / 1000),
    })
  } catch (error) {
    deps.logger.warn('edition_published_metrics_unavailable', { dateSlug, error: errorMessage(error) })
  }
}

export async function publishDailyBreadEdition(
  dateSlug: string,
  deps: PublishDeps,
  options: { ignoreRollover?: boolean } = {},
): Promise<PublishOutcome> {
  const log = deps.logger
  const attempt = newAttempt(deps, dateSlug, 'publish')
  try {
    const now = deps.clock.now()
    if (!options.ignoreRollover && now.getTime() < rolloverInstant(dateSlug).getTime()) {
      attempt.publicationResult = 'skipped'
      attempt.warnings.push('rollover not reached')
      return { result: 'too_early' }
    }

    if (deps.rejectedSourceItems) {
      const edition = await deps.repo.getEdition(dateSlug, { includeUnpublished: true })
      if (edition?.lifecycle === 'ready') {
        const ids = edition.generation.sourceItemIds ?? []
        const rejected = ids.length > 0 ? await deps.rejectedSourceItems(ids) : []
        if (rejected.length > 0) {
          await deps.repo.reopenReady(dateSlug)
          attempt.publicationResult = 'skipped'
          attempt.warnings.push(`reviewed items rejected after build: ${rejected.join(', ')}`)
          log.warn('publish_rebuild_required', { dateSlug, rejected })
          return { result: 'rebuild_required', reason: 'source item rejected' }
        }
      }
    }

    attempt.lifecycleStage = 'published'
    const published = await log.stage('published', () => deps.repo.publish(dateSlug, now))
    attempt.issue = published.issue
    attempt.lifecycleStage = `publish:${published.result}`
    attempt.publicationResult =
      published.result === 'published'
        ? 'published'
        : published.result === 'already_published'
          ? 'already_published'
          : 'skipped'
    log.info('publish_result', { dateSlug, ...published })
    if (published.result === 'published') await logPublishedMetrics(deps, dateSlug, now)
    return { result: published.result, issue: published.issue, volume: published.volume }
  } catch (error) {
    // The stage in progress when it failed (the publish transaction, or the rebuild check before it).
    attempt.errors.push({ stage: attempt.lifecycleStage, message: errorMessage(error) })
    attempt.publicationResult = 'failed'
    log.error('publish_failed', error, { dateSlug })
    return { result: 'failed', reason: errorMessage(error) }
  } finally {
    await finishAttempt(deps, attempt)
  }
}
