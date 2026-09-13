/**
 * Backfill: archive editions for dates BEFORE Daily Bread V2 existed
 * (SA-142 / F-184). Backfilled editions are built with the deterministic
 * policy (no model spend), published as archive entries, and NEVER consume an
 * issue number — "No. 001" stays the first native paper. Dates that already
 * have a row, and dates on or after the live editorial date, are skipped.
 */
import { createDailyBreadEdition, type PipelineDeps } from './orchestrator'
import { publishDailyBreadEdition } from './publish'
import { addDays, fixedClock, isValidDateSlug, rolloverInstant } from './time'

export const MAX_BACKFILL_DAYS = 400

export interface BackfillResult {
  published: string[]
  skipped: { date: string; reason: string }[]
  failed: { date: string; reason: string }[]
}

export async function runBackfill(params: {
  from: string
  to: string
  liveDate: string
  deps: PipelineDeps
}): Promise<BackfillResult> {
  const { from, to, liveDate, deps } = params
  if (!isValidDateSlug(from) || !isValidDateSlug(to) || from > to) {
    throw new Error('backfill: --from and --to must be dates with from <= to')
  }
  const dates: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dates.push(d)
    if (dates.length > MAX_BACKFILL_DAYS) {
      throw new Error(`backfill: at most ${MAX_BACKFILL_DAYS} days per run`)
    }
  }

  const result: BackfillResult = { published: [], skipped: [], failed: [] }
  for (const date of dates) {
    if (date >= liveDate) {
      result.skipped.push({ date, reason: 'not in the past (native editions own today onward)' })
      continue
    }
    const existing = await deps.repo.getLifecycle(date)
    if (existing === 'published' || existing === 'superseded') {
      result.skipped.push({ date, reason: `already ${existing}` })
      continue
    }
    const dayDeps: PipelineDeps = {
      ...deps,
      policy: 'deterministic-only',
      trigger: 'backfill',
      clock: fixedClock(rolloverInstant(date)),
    }
    const built =
      existing === 'ready'
        ? { result: 'ready' as const }
        : await createDailyBreadEdition(date, dayDeps, { archiveOrigin: 'backfilled' })
    if (built.result !== 'ready') {
      result.failed.push({ date, reason: built.reason ?? built.result })
      continue
    }
    const pub = await publishDailyBreadEdition(date, dayDeps, { ignoreRollover: true })
    if (pub.result === 'published' || pub.result === 'already_published') {
      if (pub.issue !== null && pub.issue !== undefined) {
        // The row was native (created earlier by another path); report loudly.
        result.failed.push({ date, reason: `published as native issue ${pub.issue}, not backfilled` })
      } else {
        result.published.push(date)
      }
    } else {
      result.failed.push({ date, reason: pub.reason ?? pub.result })
    }
  }
  return result
}
