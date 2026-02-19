import { NextRequest, NextResponse } from 'next/server'
import { isDayLockingEnabledForRequest } from '@/lib/day-locking'
import { SERIES_DATA } from '@/data/series'
import {
  getAllPlanDaysWithFallback,
  getLatestSelectionForSessionWithFallback,
  getLatestPlanInstanceForSessionWithFallback,
  getPlanInstanceWithFallback,
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
  scriptureText: string
  status: ActiveDayStatus
  route: string
  lockMessage?: string
  unlockAt?: string
}

function statusPriority(status: ActiveDayStatus): number {
  if (status === 'current') return 5
  if (status === 'onboarding') return 4
  if (status === 'unlocked') return 3
  if (status === 'archived') return 2
  return 1
}

function resolveUnlockAtIso(
  cycleStartAtIso: string,
  dayNumber: number,
): string {
  const base = new Date(cycleStartAtIso)
  if (Number.isNaN(base.getTime())) return cycleStartAtIso
  const target = new Date(base)
  const offset = Math.max(0, dayNumber - 1)
  target.setUTCDate(target.getUTCDate() + offset)
  return target.toISOString()
}

function parseFrameworkScripture(framework: string): {
  reference: string
  text: string
} {
  const normalized = framework.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return {
      reference: 'Scripture',
      text: 'Continue reading with focus and honesty.',
    }
  }

  const [reference, ...textParts] = normalized.split(/\s+-\s+/)
  const text = textParts.join(' - ').trim()
  return {
    reference: reference?.trim() || 'Scripture',
    text: text || 'Continue reading with focus and honesty.',
  }
}

function buildSeriesActiveDays(seriesSlug: string): ActiveDayRow[] {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return []

  const scripture = parseFrameworkScripture(series.framework)
  return series.days
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((day, index) => ({
      day: day.day,
      title: day.title,
      scriptureReference: scripture.reference,
      scriptureText: scripture.text,
      status: index === 0 ? 'current' : 'unlocked',
      route: `/devotional/${day.slug}`,
    }))
}

type CurrentSource =
  | {
      kind: 'plan'
      createdAt: string
      plan: {
        plan_token: string
        series_slug: string
        start_policy:
          | 'monday_cycle'
          | 'tuesday_archived_monday'
          | 'wed_sun_onboarding'
        cycle_start_at: string
        timezone_offset_minutes: number
      }
    }
  | {
      kind: 'series'
      createdAt: string
      seriesSlug: string
    }

export async function GET(request: NextRequest) {
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const latestPlan =
      await getLatestPlanInstanceForSessionWithFallback(sessionToken)
    const latestSelection =
      await getLatestSelectionForSessionWithFallback(sessionToken)
    const planFromSelection =
      latestSelection?.option_kind === 'ai_primary' &&
      latestSelection.plan_token
        ? await getPlanInstanceWithFallback(latestSelection.plan_token)
        : null

    const candidates: CurrentSource[] = []
    if (latestPlan) {
      candidates.push({
        kind: 'plan',
        createdAt: latestPlan.created_at,
        plan: latestPlan,
      })
    }
    if (planFromSelection) {
      candidates.push({
        kind: 'plan',
        createdAt: latestSelection?.created_at || planFromSelection.created_at,
        plan: planFromSelection,
      })
    }
    if (latestSelection?.option_kind === 'curated_prefab') {
      candidates.push({
        kind: 'series',
        createdAt: latestSelection.created_at,
        seriesSlug: latestSelection.series_slug,
      })
    }
    candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const currentSource = candidates[0]

    if (!currentSource) {
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
    if (currentSource.kind === 'series') {
      const days = buildSeriesActiveDays(currentSource.seriesSlug)
      return NextResponse.json(
        {
          ok: true,
          hasPlan: days.length > 0,
          planToken: null,
          seriesSlug: currentSource.seriesSlug,
          currentDay: days.length > 0 ? days[0].day : null,
          dayLocking: dayLockingEnabled ? 'enabled' : 'disabled',
          days,
        },
        { status: 200 },
      )
    }

    const latestPlanRecord = currentSource.plan
    const persistedDays = await getAllPlanDaysWithFallback(
      latestPlanRecord.plan_token,
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
          scriptureText: day.content.scriptureText,
          status: 'unlocked',
          route: `/soul-audit/results?planToken=${latestPlanRecord.plan_token}&day=${day.day_number}`,
        }
      }

      const unlock = isPlanDayUnlocked({
        nowUtc,
        policy: latestPlanRecord.start_policy,
        cycleStartAtIso: latestPlanRecord.cycle_start_at,
        dayNumber: day.day_number,
        offsetMinutes: latestPlanRecord.timezone_offset_minutes,
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
        scriptureText: day.content.scriptureText,
        status,
        route: `/soul-audit/results?planToken=${latestPlanRecord.plan_token}&day=${day.day_number}`,
        lockMessage: status === 'locked' ? unlock.message : undefined,
        unlockAt:
          status === 'locked'
            ? resolveUnlockAtIso(
                latestPlanRecord.cycle_start_at,
                day.day_number,
              )
            : undefined,
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
        planToken: latestPlanRecord.plan_token,
        seriesSlug: latestPlanRecord.series_slug,
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
