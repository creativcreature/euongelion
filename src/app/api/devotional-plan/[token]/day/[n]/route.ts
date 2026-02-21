import { NextRequest, NextResponse } from 'next/server'
import { isDayLockingEnabledForRequest } from '@/lib/day-locking'
import {
  type DevotionalPlanInstanceRecord,
  getAllPlanDaysWithFallback,
  getPlanDayWithFallback,
  getPlanInstanceWithFallback,
} from '@/lib/soul-audit/repository'
import { isPlanDayUnlocked } from '@/lib/soul-audit/schedule'
import type { CustomPlanDay } from '@/types/soul-audit'

function onboardingDay(instance: DevotionalPlanInstanceRecord) {
  const variant = instance.onboarding_variant ?? 'none'
  const variantTitle =
    variant === 'wednesday_3_day'
      ? 'Wednesday 3-Day Primer'
      : variant === 'thursday_2_day'
        ? 'Thursday 2-Day Primer'
        : variant === 'friday_1_day'
          ? 'Friday 1-Day Primer'
          : 'Weekend Bridge Primer'
  const intro =
    variant === 'wednesday_3_day'
      ? 'You joined on Wednesday. This 3-day rhythm primer (Wed-Thu-Fri) helps you establish cadence before the Monday cycle starts.'
      : variant === 'thursday_2_day'
        ? 'You joined on Thursday. This 2-day rhythm primer (Thu-Fri) helps you settle your pace before the Monday cycle starts.'
        : variant === 'friday_1_day'
          ? 'You joined on Friday. This focused 1-day primer prepares your heart for the Monday cycle.'
          : 'You joined on the weekend. This bridge day helps you settle your pace before the Monday cycle starts.'

  return {
    day: 0,
    title: `Onboarding: ${variantTitle}`,
    scriptureReference: 'Lamentations 3:22-23',
    scriptureText:
      'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.',
    reflection: `${intro} Read slowly, note what feels heavy, and bring it honestly before God.`,
    prayer:
      'Lord Jesus, prepare my heart for the cycle ahead. Teach me to begin with honesty and receive your mercy day by day.',
    nextStep:
      'Set a reminder for 7:00 AM local time on Monday so your full cycle begins with intention.',
    journalPrompt:
      'What do I most need God to stabilize in me before Monday begins?',
    endnotes: [
      {
        id: 1,
        source: 'Scripture',
        note: 'Lamentations 3:22-23',
      },
      {
        id: 2,
        source: 'Scheduling Policy',
        note: `${variant} onboarding before Monday cycle.`,
      },
    ],
  }
}

function scheduleMeta(
  instance: DevotionalPlanInstanceRecord,
  dayLockingEnabled: boolean,
) {
  return {
    startPolicy: instance.start_policy,
    onboardingVariant: instance.onboarding_variant ?? 'none',
    onboardingDays: instance.onboarding_days ?? 0,
    cycleStartAt: instance.cycle_start_at,
    timezone: instance.timezone,
    timezoneOffsetMinutes: instance.timezone_offset_minutes,
    dayLocking: dayLockingEnabled ? 'enabled' : 'disabled',
  } as const
}

async function resolvePlanDayContent(
  token: string,
  dayNumber: number,
): Promise<CustomPlanDay | null> {
  const exact = await getPlanDayWithFallback(token, dayNumber)
  if (exact?.content) return exact.content

  const all = await getAllPlanDaysWithFallback(token)
  const sorted = [...all].sort((a, b) => a.day_number - b.day_number)
  const onboarding = sorted.find((entry) => entry.day_number === 0)?.content
  const sequence = sorted
    .filter((entry) => entry.day_number > 0)
    .map((entry) => entry.content)

  if (dayNumber === 0 && onboarding) return onboarding
  const byIndex = sequence[dayNumber - 1]
  if (!byIndex) return null

  return {
    ...byIndex,
    day: dayNumber,
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; n: string }> },
) {
  try {
    const { token, n } = await context.params
    const dayNumber = Number.parseInt(n, 10)
    const previewRequested =
      new URL(request.url).searchParams.get('preview') === '1'
    if (!token || !Number.isFinite(dayNumber)) {
      return NextResponse.json(
        { error: 'Invalid token or day.' },
        { status: 400 },
      )
    }

    const instance = await getPlanInstanceWithFallback(token)
    if (!instance) {
      return NextResponse.json({ error: 'Plan not found.' }, { status: 404 })
    }

    const dayLockingEnabled = isDayLockingEnabledForRequest(request)
    if (!dayLockingEnabled) {
      const unlockedDay = await resolvePlanDayContent(token, dayNumber)
      if (!unlockedDay) {
        return NextResponse.json(
          { error: 'Plan day not found.' },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          locked: false,
          archived: false,
          onboarding: dayNumber === 0,
          day: unlockedDay,
          policy: instance.start_policy,
          schedule: scheduleMeta(instance, false),
        },
        { status: 200 },
      )
    }

    const unlock = isPlanDayUnlocked({
      nowUtc: new Date(),
      policy: instance.start_policy,
      cycleStartAtIso: instance.cycle_start_at,
      dayNumber,
      offsetMinutes: instance.timezone_offset_minutes,
    })

    if (!unlock.unlocked) {
      if (previewRequested && dayNumber > 0) {
        const previewDay = await resolvePlanDayContent(token, dayNumber)
        return NextResponse.json(
          {
            locked: true,
            archived: false,
            onboarding: false,
            day: previewDay
              ? {
                  day: previewDay.day,
                  title: previewDay.title,
                  scriptureReference: previewDay.scriptureReference,
                  scriptureText: previewDay.scriptureText,
                }
              : null,
            message: unlock.message,
            policy: instance.start_policy,
            schedule: scheduleMeta(instance, true),
          },
          { status: 200 },
        )
      }

      return NextResponse.json(
        {
          locked: true,
          message: unlock.message,
          policy: instance.start_policy,
          day: dayNumber,
          schedule: scheduleMeta(instance, true),
        },
        { status: 423 },
      )
    }

    if (unlock.onboarding && dayNumber === 0) {
      const onboardingPlanDay = await getPlanDayWithFallback(token, 0)
      return NextResponse.json(
        {
          locked: false,
          archived: false,
          onboarding: true,
          day: onboardingPlanDay?.content ?? onboardingDay(instance),
          policy: instance.start_policy,
          schedule: scheduleMeta(instance, true),
        },
        { status: 200 },
      )
    }

    const planDay = await resolvePlanDayContent(token, dayNumber)
    if (!planDay) {
      return NextResponse.json(
        { error: 'Plan day not found.' },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        locked: false,
        archived: unlock.archived,
        onboarding: false,
        day: planDay,
        policy: instance.start_policy,
        schedule: scheduleMeta(instance, true),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Plan day fetch error:', error)
    return NextResponse.json(
      { error: 'Unable to load plan day right now.' },
      { status: 500 },
    )
  }
}
