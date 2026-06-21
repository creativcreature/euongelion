import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ModuleRenderer from '@/components/ModuleRenderer'
import { onboardingDayContentToModules } from '@/lib/soul-audit/onboarding-day-to-reader'
import { buildOnboardingDay } from '@/lib/soul-audit/curated-builder'
import type { CustomPlanDay } from '@/types/soul-audit'
import type { DayContent } from '@/types/soul-audit-plan'

afterEach(cleanup)

// End-to-end: the day-0 grounded content, derived into editorial modules, must
// actually RENDER through the same ModuleRenderer pipeline the catalog reader
// uses — drop-cap Scripture, teaching sections, reflection, prayer.

const firstDay: CustomPlanDay = {
  day: 1,
  title: 'When everything shakes',
  scriptureReference: 'Lamentations 3:22-23',
  scriptureText:
    'The steadfast love of the Lord never ceases; his mercies never come to an end.',
  reflection: '',
  prayer: '',
  nextStep: '',
  journalPrompt: '',
}

function buildContent(): DayContent {
  const onboarding = buildOnboardingDay({
    userResponse: 'I feel scattered and tired.',
    firstDay,
    variant: 'wednesday_3_day',
    onboardingDays: 3,
  })
  return {
    title: onboarding.title,
    hookA: '',
    textB: onboarding.reflection ?? '',
    textBPreview: '',
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: onboarding.scriptureReference,
    scriptureText: onboarding.scriptureText,
    hebrewGreekStudy: null,
    interactiveElement: { type: 'reflection', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: onboarding.journalPrompt
      ? onboarding.journalPrompt.split('\n').filter(Boolean)
      : [],
    prayer: onboarding.prayer ?? '',
    endnotes: [],
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

describe('onboarding day-0 editorial render', () => {
  it('renders the verbatim Scripture reference through ScriptureModule', () => {
    const modules = onboardingDayContentToModules(buildContent())
    render(
      <>
        {modules.map((m, i) => (
          <ModuleRenderer
            key={i}
            module={m as unknown as Record<string, unknown>}
          />
        ))}
      </>,
    )
    expect(screen.getByText(/Lamentations 3:22-23/)).toBeInTheDocument()
  })

  it('renders the editorial teaching subhead headings', () => {
    const modules = onboardingDayContentToModules(buildContent())
    render(
      <>
        {modules.map((m, i) => (
          <ModuleRenderer
            key={i}
            module={m as unknown as Record<string, unknown>}
          />
        ))}
      </>,
    )
    expect(screen.getByText('Sit with the verse above.')).toBeInTheDocument()
    expect(screen.getByText('What the week ahead will be')).toBeInTheDocument()
  })

  it('renders the prayer text through PrayerModule', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    render(
      <>
        {modules.map((m, i) => (
          <ModuleRenderer
            key={i}
            module={m as unknown as Record<string, unknown>}
          />
        ))}
      </>,
    )
    expect(
      screen.getByText(/steady my pace as I begin this path/i),
    ).toBeInTheDocument()
  })
})
