import { NextRequest, NextResponse } from 'next/server'
import {
  getPlanDayWithFallback,
  getPlanInstanceWithFallback,
} from '@/lib/soul-audit/repository'
import { isPlanDayUnlocked } from '@/lib/soul-audit/schedule'

function onboardingDay() {
  return {
    day: 0,
    title: 'Onboarding: Prepare for Monday',
    scriptureReference: 'Lamentations 3:22-23',
    scriptureText:
      'The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.',
    reflection:
      'You joined midweek, so this onboarding day helps you settle your pace. Read slowly, note what feels heavy, and bring it honestly before God.',
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
        note: 'Wed-Sun starts receive onboarding before Monday cycle.',
      },
    ],
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

    const unlock = isPlanDayUnlocked({
      nowUtc: new Date(),
      policy: instance.start_policy,
      cycleStartAtIso: instance.cycle_start_at,
      dayNumber,
      offsetMinutes: instance.timezone_offset_minutes,
    })

    if (!unlock.unlocked) {
      if (previewRequested && dayNumber > 0) {
        const previewDay = await getPlanDayWithFallback(token, dayNumber)
        return NextResponse.json(
          {
            locked: true,
            archived: false,
            onboarding: false,
            day: previewDay?.content
              ? {
                  day: previewDay.content.day,
                  title: previewDay.content.title,
                  scriptureReference: previewDay.content.scriptureReference,
                  scriptureText: previewDay.content.scriptureText,
                }
              : null,
            message: unlock.message,
            policy: instance.start_policy,
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
          day: onboardingPlanDay?.content ?? onboardingDay(),
          policy: instance.start_policy,
        },
        { status: 200 },
      )
    }

    const planDay = await getPlanDayWithFallback(token, dayNumber)
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
        day: planDay.content,
        policy: instance.start_policy,
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
