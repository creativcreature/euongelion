import { NextRequest, NextResponse } from 'next/server'
import { isDayLockingEnabledForRequest } from '@/lib/day-locking'
import {
  getAllPlanDaysWithFallback,
  getLatestPlanInstanceForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import { isPlanDayUnlocked } from '@/lib/soul-audit/schedule'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

type ActiveDayStatus =
  | 'current'
  | 'unlocked'
  | 'locked'
  | 'archived'
  | 'onboarding'

type ActiveDayRow = {
  day: number
  title: string
  scriptureReference: string
  status: ActiveDayStatus
  route: string
  lockMessage?: string
}

function statusPriority(status: ActiveDayStatus): number {
  if (status === 'current') return 5
  if (status === 'onboarding') return 4
  if (status === 'unlocked') return 3
  if (status === 'archived') return 2
  return 1
}

export async function GET(request: NextRequest) {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const latestPlan =
      await getLatestPlanInstanceForSessionWithFallback(sessionToken)

    if (!latestPlan) {
      return NextResponse.json(
        {
          ok: true,
          hasPlan: false,
          dayLocking: isDayLockingEnabledForRequest(request)
            ? 'enabled'
            : 'disabled',
          days: [],
        },
        { status: 200 },
      )
    }

    const dayLockingEnabled = isDayLockingEnabledForRequest(request)
    const persistedDays = await getAllPlanDaysWithFallback(
      latestPlan.plan_token,
    )
    const sortedDays = [...persistedDays].sort(
      (a, b) => a.day_number - b.day_number,
    )
    const nowUtc = new Date()

    const baseDays: ActiveDayRow[] = sortedDays.map((day) => {
      if (!dayLockingEnabled) {
        return {
          day: day.day_number,
          title: day.content.title,
          scriptureReference: day.content.scriptureReference,
          status: 'unlocked',
          route: `/soul-audit/results?planToken=${latestPlan.plan_token}#plan-day-${day.day_number}`,
        }
      }

      const unlock = isPlanDayUnlocked({
        nowUtc,
        policy: latestPlan.start_policy,
        cycleStartAtIso: latestPlan.cycle_start_at,
        dayNumber: day.day_number,
        offsetMinutes: latestPlan.timezone_offset_minutes,
      })

      const status: ActiveDayStatus = unlock.onboarding
        ? 'onboarding'
        : unlock.archived
          ? 'archived'
          : unlock.unlocked
            ? 'unlocked'
            : 'locked'

      return {
        day: day.day_number,
        title: day.content.title,
        scriptureReference: day.content.scriptureReference,
        status,
        route: `/soul-audit/results?planToken=${latestPlan.plan_token}#plan-day-${day.day_number}`,
        lockMessage: status === 'locked' ? unlock.message : undefined,
      }
    })

    let currentDay: number | null = null
    const currentCandidate = [...baseDays]
      .filter((day) => day.status === 'unlocked' || day.status === 'onboarding')
      .sort((a, b) => b.day - a.day)[0]
    if (currentCandidate) {
      currentDay = currentCandidate.day
    } else {
      const fallbackCandidate = [...baseDays]
        .filter((day) => day.status !== 'locked')
        .sort((a, b) => b.day - a.day)[0]
      if (fallbackCandidate) {
        currentDay = fallbackCandidate.day
      }
    }

    const days = baseDays.map((day) => ({
      ...day,
      status:
        day.day === currentDay &&
        (day.status === 'unlocked' || day.status === 'onboarding')
          ? ('current' as const)
          : day.status,
    }))

    days.sort((a, b) => {
      if (a.day === b.day) {
        return statusPriority(b.status) - statusPriority(a.status)
      }
      return a.day - b.day
    })

    return NextResponse.json(
      {
        ok: true,
        hasPlan: true,
        planToken: latestPlan.plan_token,
        seriesSlug: latestPlan.series_slug,
        currentDay,
        dayLocking: dayLockingEnabled ? 'enabled' : 'disabled',
        days,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Active days load error:', error)
    return NextResponse.json(
      { error: 'Unable to load active devotional days.' },
      { status: 500 },
    )
  }
}
