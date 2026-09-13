/**
 * The editorial clock — the ONE place Daily Bread V2 turns an instant into an
 * editorial date (SA-142 / F-184).
 *
 * The paper is a New York morning paper: the edition for a date goes live at
 * 07:00 America/New_York (the SA-114 7am rule, kept exactly — see the parity
 * test against src/lib/edition/deadline.ts). DST is resolved per instant with
 * Intl, never with a fixed offset.
 *
 * Pure: no I/O, safe for server, client and scripts.
 */

export const EDITORIAL_TIMEZONE = 'America/New_York'
export const ROLLOVER_HOUR = 7
/** How long before rollover the scheduler starts building the next paper. */
export const BUILD_LEAD_HOURS = 12

const DATE_SLUG_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 86_400_000

export interface EditorialClock {
  now(): Date
}

export const systemClock: EditorialClock = { now: () => new Date() }

export function fixedClock(iso: string | Date): EditorialClock {
  const at = typeof iso === 'string' ? new Date(iso) : iso
  return { now: () => new Date(at.getTime()) }
}

/** Offset of the editorial zone from UTC at `at`, in minutes (EDT = -240). */
export function zoneOffsetMinutes(at: Date, timeZone = EDITORIAL_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000)
}

/** A strict YYYY-MM-DD that is also a real calendar date. */
export function isValidDateSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = DATE_SLUG_RE.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (y < 2000 || y > 2200) return false
  const t = new Date(Date.UTC(y, mo - 1, d))
  return (
    t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
  )
}

export function addDays(dateSlug: string, days: number): string {
  if (!isValidDateSlug(dateSlug)) {
    throw new Error(`addDays: not a date slug: ${String(dateSlug)}`)
  }
  const t = Date.parse(`${dateSlug}T00:00:00Z`) + days * DAY_MS
  return new Date(t).toISOString().slice(0, 10)
}

/** The instant (UTC) at which `dateSlug`'s edition goes live. */
export function rolloverInstant(dateSlug: string): Date {
  if (!isValidDateSlug(dateSlug)) {
    throw new Error(`rolloverInstant: not a date slug: ${String(dateSlug)}`)
  }
  // First guess with the offset at local noon of that day, then correct once:
  // the rollover hour is never inside a DST transition gap (those are at 2am).
  const naive = Date.parse(`${dateSlug}T${String(ROLLOVER_HOUR).padStart(2, '0')}:00:00Z`)
  const offset = zoneOffsetMinutes(new Date(Date.parse(`${dateSlug}T16:00:00Z`)))
  return new Date(naive - offset * 60_000)
}

/** The editorial date live at `at`: the NY calendar date, minus one before 7am. */
export function editorialDate(at: Date = new Date()): string {
  const offset = zoneOffsetMinutes(at)
  const local = new Date(at.getTime() + offset * 60_000)
  if (local.getUTCHours() < ROLLOVER_HOUR) {
    local.setUTCDate(local.getUTCDate() - 1)
  }
  return local.toISOString().slice(0, 10)
}

export interface SchedulePlan {
  /** The edition readers should be seeing right now. */
  liveDate: string
  /** The next edition to prepare. */
  nextDate: string
  /** Instant the next edition goes live. */
  nextRollover: Date
  /** True when we are inside the build window for `nextDate`. */
  inBuildWindow: boolean
}

export function schedulePlan(clock: EditorialClock = systemClock): SchedulePlan {
  const at = clock.now()
  const liveDate = editorialDate(at)
  const nextDate = addDays(liveDate, 1)
  const nextRollover = rolloverInstant(nextDate)
  const inBuildWindow =
    nextRollover.getTime() - at.getTime() <= BUILD_LEAD_HOURS * 3_600_000
  return { liveDate, nextDate, nextRollover, inBuildWindow }
}

/** Midnight-UTC Date for a slug — the key every date-derived bank uses. */
export function slugToUtcDate(dateSlug: string): Date {
  if (!isValidDateSlug(dateSlug)) {
    throw new Error(`slugToUtcDate: not a date slug: ${String(dateSlug)}`)
  }
  return new Date(`${dateSlug}T00:00:00Z`)
}

/** "Sunday, September 13, 2026" for a slug (calendar date, not an instant). */
export function formatEditorialDate(dateSlug: string): string {
  return slugToUtcDate(dateSlug).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
