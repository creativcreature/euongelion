/**
 * Reminder windows — the "one quiet word" delivery model (F-070).
 *
 * A reader picks ONE local-time window; the hourly sender (Supabase edge
 * function `send-daily-push`, fired by pg_cron) delivers at most ONE push per
 * local calendar day, inside that window. This module is the single source of
 * truth for the window definitions and the pure matching logic — the settings
 * UI, the push API routes, and the unit tests all import from here.
 *
 * The Deno edge function cannot import app source (it is deliberately
 * self-contained), so it carries an equivalent implementation. If you change
 * the window boundaries here, change them in
 * `supabase/functions/send-daily-push/index.ts` too — the unit tests pin the
 * boundary values so drift is caught.
 *
 * Model anchor: Waking Up's "Moment" — a single, unhurried daily touchpoint.
 */

export const REMINDER_WINDOW_CODES = [
  'early_morning',
  'morning',
  'midday',
  'evening',
] as const

export type ReminderWindow = (typeof REMINDER_WINDOW_CODES)[number]

export interface ReminderWindowMeta {
  /** Human label, brand-cased by the UI. */
  label: string
  /** Compact hour range for display, 24h local time. */
  hoursLabel: string
  /** Inclusive local start hour (0-23). */
  startHour: number
  /** Exclusive local end hour (0-23). */
  endHour: number
}

export const REMINDER_WINDOWS: Record<ReminderWindow, ReminderWindowMeta> = {
  early_morning: {
    label: 'Early morning',
    hoursLabel: '5–7',
    startHour: 5,
    endHour: 7,
  },
  morning: { label: 'Morning', hoursLabel: '7–9', startHour: 7, endHour: 9 },
  midday: { label: 'Midday', hoursLabel: '12–14', startHour: 12, endHour: 14 },
  evening: {
    label: 'Evening',
    hoursLabel: '19–21',
    startHour: 19,
    endHour: 21,
  },
}

/**
 * Legacy rows (opted in through PushOptIn before windows existed) were
 * promised "one quiet word each morning" — morning preserves that promise.
 * Matches the column default in migration 017.
 */
export const DEFAULT_REMINDER_WINDOW: ReminderWindow = 'morning'

export function isReminderWindow(value: unknown): value is ReminderWindow {
  return (
    typeof value === 'string' &&
    (REMINDER_WINDOW_CODES as readonly string[]).includes(value)
  )
}

/** True when `timezone` is an IANA zone this runtime can resolve. */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export interface LocalClock {
  /** Local hour of day, 0-23. */
  hour: number
  /** Local calendar date, YYYY-MM-DD. */
  isoDate: string
  /** The timezone actually used (UTC when input was missing/invalid). */
  timezone: string
}

/**
 * Resolve the wall-clock hour and calendar date in the reader's timezone.
 * Missing or unresolvable timezones are evaluated as UTC — the API validates
 * timezones at save time, so this guard only covers rows written before
 * validation existed or zones this runtime's ICU data does not know.
 */
export function localClockFor(
  timezone: string | null | undefined,
  now: Date,
): LocalClock {
  const tz = timezone && isValidTimezone(timezone) ? timezone : 'UTC'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(now)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  return {
    hour: Number(read('hour')),
    isoDate: `${read('year')}-${read('month')}-${read('day')}`,
    timezone: tz,
  }
}

export function windowMatchesHour(
  window: ReminderWindow,
  hour: number,
): boolean {
  const meta = REMINDER_WINDOWS[window]
  return hour >= meta.startHour && hour < meta.endHour
}

export type ReminderSkipReason = 'outside_window' | 'already_sent'

export interface ReminderDecision {
  send: boolean
  /** The reader-local calendar date the decision was made for. */
  localDate: string
  reason?: ReminderSkipReason
}

/**
 * The idempotent hourly decision: send exactly once per local calendar day,
 * only inside the reader's chosen window. `lastSentDate` is the reader-local
 * YYYY-MM-DD recorded by the sender after the previous successful delivery.
 */
export function shouldSendReminderNow(params: {
  window: string | null | undefined
  timezone: string | null | undefined
  lastSentDate: string | null | undefined
  now: Date
}): ReminderDecision {
  const window = isReminderWindow(params.window)
    ? params.window
    : DEFAULT_REMINDER_WINDOW
  const clock = localClockFor(params.timezone, params.now)

  if (!windowMatchesHour(window, clock.hour)) {
    return { send: false, localDate: clock.isoDate, reason: 'outside_window' }
  }
  if (params.lastSentDate === clock.isoDate) {
    return { send: false, localDate: clock.isoDate, reason: 'already_sent' }
  }
  return { send: true, localDate: clock.isoDate }
}
