type StartPolicy =
  | 'monday_cycle'
  | 'tuesday_archived_monday'
  | 'wed_sun_onboarding'

const UNLOCK_HOUR = 7

function toLocal(utc: Date, offsetMinutes: number): Date {
  return new Date(utc.getTime() - offsetMinutes * 60 * 1000)
}

function toUtc(local: Date, offsetMinutes: number): Date {
  return new Date(local.getTime() + offsetMinutes * 60 * 1000)
}

function startOfDay(local: Date): Date {
  const d = new Date(local)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function withUnlockHour(local: Date): Date {
  const d = new Date(local)
  d.setUTCHours(UNLOCK_HOUR, 0, 0, 0)
  return d
}

function addDays(local: Date, days: number): Date {
  const d = new Date(local)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function getMonday(local: Date): Date {
  const day = local.getUTCDay()
  const delta = day === 0 ? -6 : 1 - day
  return addDays(startOfDay(local), delta)
}

function getNextMonday(local: Date): Date {
  const day = local.getUTCDay()
  const delta = day === 0 ? 1 : 8 - day
  return addDays(startOfDay(local), delta)
}

export function resolveStartPolicy(
  nowUtc: Date,
  offsetMinutes: number,
): {
  startPolicy: StartPolicy
  startedAt: string
  cycleStartAt: string
} {
  const localNow = toLocal(nowUtc, offsetMinutes)
  const day = localNow.getUTCDay()

  let startPolicy: StartPolicy
  let cycleStartLocal: Date

  if (day === 1) {
    startPolicy = 'monday_cycle'
    cycleStartLocal = withUnlockHour(startOfDay(localNow))
  } else if (day === 2) {
    startPolicy = 'tuesday_archived_monday'
    cycleStartLocal = withUnlockHour(getMonday(localNow))
  } else {
    startPolicy = 'wed_sun_onboarding'
    cycleStartLocal = withUnlockHour(getNextMonday(localNow))
  }

  return {
    startPolicy,
    startedAt: nowUtc.toISOString(),
    cycleStartAt: toUtc(cycleStartLocal, offsetMinutes).toISOString(),
  }
}

export function isPlanDayUnlocked(params: {
  nowUtc: Date
  policy: StartPolicy
  cycleStartAtIso: string
  dayNumber: number
  offsetMinutes: number
}): {
  unlocked: boolean
  archived: boolean
  onboarding: boolean
  message: string
} {
  const { nowUtc, dayNumber, offsetMinutes, policy } = params

  if (dayNumber < 0) {
    return {
      unlocked: false,
      archived: false,
      onboarding: false,
      message: 'Invalid day.',
    }
  }

  const cycleStartUtc = new Date(params.cycleStartAtIso)
  const localNow = toLocal(nowUtc, offsetMinutes)
  const cycleStartLocal = toLocal(cycleStartUtc, offsetMinutes)

  if (policy === 'wed_sun_onboarding' && dayNumber === 0) {
    return {
      unlocked: true,
      archived: false,
      onboarding: true,
      message: '',
    }
  }

  if (policy === 'tuesday_archived_monday' && dayNumber === 1) {
    return {
      unlocked: true,
      archived: true,
      onboarding: false,
      message: '',
    }
  }

  if (dayNumber === 0) {
    return {
      unlocked: false,
      archived: false,
      onboarding: false,
      message: 'This onboarding day is not available for this cycle.',
    }
  }

  const targetLocal = addDays(cycleStartLocal, dayNumber - 1)
  targetLocal.setUTCHours(UNLOCK_HOUR, 0, 0, 0)

  if (localNow >= targetLocal) {
    return {
      unlocked: true,
      archived: false,
      onboarding: false,
      message: '',
    }
  }

  return {
    unlocked: false,
    archived: false,
    onboarding: false,
    message:
      "This day isn't ready yet. Your next day unlocks at 7:00 AM local time.",
  }
}
