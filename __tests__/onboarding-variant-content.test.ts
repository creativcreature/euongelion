import { describe, expect, it } from 'vitest'
import { buildOnboardingDay } from '@/lib/soul-audit/curated-builder'
import type { CustomPlanDay } from '@/types/soul-audit'

const firstDay: CustomPlanDay = {
  day: 1,
  title: 'When everything shakes',
  scriptureReference: 'Lamentations 3:22-23',
  scriptureText:
    'The steadfast love of the Lord never ceases; his mercies never come to an end.',
  reflection: 'Sample reflection',
  prayer: 'Sample prayer',
  nextStep: 'Sample next step',
  journalPrompt: 'Sample journal prompt',
}

describe('buildOnboardingDay variant copy', () => {
  it('returns Wednesday variant title and cadence copy', () => {
    const day = buildOnboardingDay({
      userResponse: 'I feel scattered and tired.',
      firstDay,
      variant: 'wednesday_3_day',
      onboardingDays: 3,
    })

    expect(day.title).toBe('Onboarding: Wednesday 3-Day Primer')
    expect(day.nextStep).toContain('3-day rhythm primer')
    expect(day.nextStep).toContain('build consistency')
  })

  it('returns Thursday variant title and cadence copy', () => {
    const day = buildOnboardingDay({
      userResponse: 'I need to start over.',
      firstDay,
      variant: 'thursday_2_day',
      onboardingDays: 2,
    })

    expect(day.title).toBe('Onboarding: Thursday 2-Day Primer')
    expect(day.nextStep).toContain('2-day rhythm primer')
  })

  it('returns Friday variant title and focused copy', () => {
    const day = buildOnboardingDay({
      userResponse: 'I am numb but trying.',
      firstDay,
      variant: 'friday_1_day',
      onboardingDays: 1,
    })

    expect(day.title).toBe('Onboarding: Friday 1-Day Primer')
    expect(day.nextStep).toContain('Full cycle unlock begins Monday')
  })
})
