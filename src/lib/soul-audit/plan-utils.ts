import type { DayScheduleEntry } from '@/types/soul-audit-plan'

/**
 * Check if a schedule entry is unlocked (viewable) based on current time.
 * Sabbath is always viewable (UI renders rest screen, not locked state).
 */
export function isUnlocked(entry: DayScheduleEntry): boolean {
  if (entry.status === 'sabbath') return true
  if (!entry.unlock_at) return false
  return new Date() >= new Date(entry.unlock_at)
}

/**
 * Build a 7-day schedule with UTC unlock timestamps.
 * Day 1: unlocked immediately. Days 2-6: 7AM local. Day 7: sabbath.
 */
export function buildSchedule(
  startDateUTC: Date,
  tzOffsetMinutes: number,
): DayScheduleEntry[] {
  const schedule: DayScheduleEntry[] = []
  for (let day = 1; day <= 7; day++) {
    const dayDate = new Date(startDateUTC.getTime() + (day - 1) * 86400000)
    if (day === 1) {
      schedule.push({
        day,
        date: dayDate.toISOString(),
        unlock_at: startDateUTC.toISOString(),
        status: 'unlocked',
      })
      continue
    }
    if (day === 7) {
      schedule.push({
        day,
        date: dayDate.toISOString(),
        unlock_at: null,
        status: 'sabbath',
      })
      continue
    }
    // 7AM local time expressed in UTC
    const sevenAm = new Date(dayDate)
    sevenAm.setUTCHours(
      7 - Math.floor(tzOffsetMinutes / 60),
      -(tzOffsetMinutes % 60),
      0,
      0,
    )
    schedule.push({
      day,
      date: dayDate.toISOString(),
      unlock_at: sevenAm.toISOString(),
      status: 'locked',
    })
  }
  return schedule
}

/**
 * Calculate the plan start date based on current day of week.
 * Mon/Tue: start immediately. Wed-Sun: next Monday.
 */
export function calculateStartDate(
  nowUTC: Date,
  tzOffsetMinutes: number,
): { startDateUTC: Date; isHolding: boolean } {
  const nowLocal = new Date(nowUTC.getTime() + tzOffsetMinutes * 60000)
  const dow = nowLocal.getUTCDay() // 0=Sun..6=Sat

  if (dow === 1) {
    // Monday
    const s = new Date(nowLocal)
    s.setUTCHours(0, 0, 0, 0)
    return {
      startDateUTC: new Date(s.getTime() - tzOffsetMinutes * 60000),
      isHolding: false,
    }
  }
  if (dow === 2) {
    // Tuesday
    const s = new Date(nowLocal)
    s.setUTCHours(0, 0, 0, 0)
    return {
      startDateUTC: new Date(s.getTime() - tzOffsetMinutes * 60000),
      isHolding: false,
    }
  }

  // Wed-Sun: next Monday
  const daysUntilMon = dow === 0 ? 1 : 8 - dow
  const mon = new Date(nowLocal)
  mon.setUTCDate(mon.getUTCDate() + daysUntilMon)
  mon.setUTCHours(0, 0, 0, 0)
  return {
    startDateUTC: new Date(mon.getTime() - tzOffsetMinutes * 60000),
    isHolding: true,
  }
}

/**
 * Determine the meta-story position (biblical narrative arc) from scripture reference.
 */
export function determineMetaStoryPosition(
  scriptureRef: string,
  theme: string,
): string {
  const r = scriptureRef.toLowerCase()
  if (r.match(/genesis [1-2][^0-9]/)) return 'CREATION'
  if (r.match(/genesis ([3-9]|1[01])/)) return 'FALL'
  if (r.match(/genesis (1[2-9]|[2-5]\d)/)) return 'PROMISE'
  if (r.match(/exodus|leviticus|numbers|deuteronomy/)) return 'EXODUS'
  if (r.match(/joshua|judges|ruth|samuel|kings|chronicles/)) return 'KINGDOM'
  if (
    r.match(
      /isaiah|jeremiah|ezekiel|daniel|hosea|joel|amos|jonah|micah|malachi/,
    )
  )
    return 'EXILE'
  if (r.match(/job|psalm|proverbs|ecclesiastes|song/)) return 'KINGDOM'
  if (r.match(/(matthew|luke) [1-2][^0-9]/)) return 'INCARNATION'
  if (r.match(/matthew|mark|luke|john/) && !r.match(/[123]\s?john/))
    return 'PASSION'
  if (r.match(/acts/)) return 'RESURRECTION'
  if (
    r.match(
      /romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|john|jude/,
    )
  )
    return 'CHURCH'
  if (r.match(/revelation/)) return 'CONSUMMATION'

  // Fallback based on theme
  if (theme.match(/anxi|fear|peace/i)) return 'CHURCH'
  if (theme.match(/hope|promise/i)) return 'PROMISE'
  if (theme.match(/identity|purpose/i)) return 'CREATION'
  return 'CHURCH'
}
