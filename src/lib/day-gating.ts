/**
 * Day-gating system — content unlocks at 7AM user timezone, one day at a time.
 *
 * Rules:
 * - Day 1 is always accessible
 * - Day 2 unlocks 7AM the day after Day 1 was accessed
 * - Sabbath day pauses the unlock schedule (no new content)
 * - "This day isn't ready yet. Good things take time. Including you."
 */

const UNLOCK_HOUR = 7 // 7 AM local time

export interface DayGateResult {
  unlocked: boolean
  message: string
}

/**
 * Check if a specific day in a series is unlocked.
 *
 * @param dayIndex - 0-based index (Day 1 = 0, Day 2 = 1, etc.)
 * @param seriesStartDate - ISO string of when user first accessed the series
 * @param sabbathDay - 'saturday' | 'sunday' — the user's Sabbath preference
 */
export function isDayUnlocked(
  dayIndex: number,
  seriesStartDate: string | null,
  sabbathDay: 'saturday' | 'sunday' = 'sunday',
  dayLockingEnabled = true,
): DayGateResult {
  if (!dayLockingEnabled) {
    return { unlocked: true, message: '' }
  }

  // Day 1 is always unlocked
  if (dayIndex === 0) {
    return { unlocked: true, message: '' }
  }

  // If series hasn't been started, only Day 1 is accessible
  if (!seriesStartDate) {
    return {
      unlocked: false,
      message:
        "This day isn't ready yet. Good things take time. Including you.",
    }
  }

  const startDate = new Date(seriesStartDate)
  const now = new Date()

  // Calculate the unlock date for this day, accounting for Sabbath pauses
  const unlockDate = getUnlockDate(startDate, dayIndex, sabbathDay)

  if (now >= unlockDate) {
    return { unlocked: true, message: '' }
  }

  return {
    unlocked: false,
    message: "This day isn't ready yet. Good things take time. Including you.",
  }
}

/**
 * Calculate when a specific day unlocks, skipping Sabbath days.
 */
function getUnlockDate(
  seriesStart: Date,
  dayIndex: number,
  sabbathDay: 'saturday' | 'sunday',
): Date {
  // Normalize the start date to 7 AM
  const start = new Date(seriesStart)
  start.setHours(UNLOCK_HOUR, 0, 0, 0)

  // If user started before 7 AM, treat as previous day
  if (seriesStart.getHours() < UNLOCK_HOUR) {
    start.setDate(start.getDate() - 1)
  }

  // Count forward, skipping Sabbath days
  let daysToUnlock = dayIndex
  const current = new Date(start)

  while (daysToUnlock > 0) {
    current.setDate(current.getDate() + 1)

    // Skip Sabbath: Saturday = 6, Sunday = 0
    const dayOfWeek = current.getDay()
    const isSabbath =
      (sabbathDay === 'saturday' && dayOfWeek === 6) ||
      (sabbathDay === 'sunday' && dayOfWeek === 0)

    if (!isSabbath) {
      daysToUnlock--
    }
  }

  // Set unlock time to 7 AM
  current.setHours(UNLOCK_HOUR, 0, 0, 0)
  return current
}

/**
 * Check if today is the user's Sabbath day.
 */
export function isSabbathToday(
  sabbathDay: 'saturday' | 'sunday' = 'sunday',
): boolean {
  const today = new Date().getDay()
  return (
    (sabbathDay === 'saturday' && today === 6) ||
    (sabbathDay === 'sunday' && today === 0)
  )
}
