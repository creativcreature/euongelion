import { describe, expect, it } from 'vitest'
import { buildOnboardingDay } from '@/lib/soul-audit/curated-builder'
import { onboardingDayContentToModules } from '@/lib/soul-audit/onboarding-day-to-reader'
import type { CustomPlanDay } from '@/types/soul-audit'
import type { DayContent } from '@/types/soul-audit-plan'

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

/**
 * Mirror of the route's `onboardingDayToContent` mapping (select/route.ts) for
 * the fields the editorial derivation consumes. Keeps this test grounded in the
 * REAL content `buildOnboardingDay` emits, not a hand-rolled fixture.
 */
function toDayContent(day: CustomPlanDay): DayContent {
  return {
    title: day.title,
    hookA: '',
    textB: day.reflection ?? '',
    textBPreview: (day.reflection ?? '').slice(0, 240),
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: day.scriptureReference,
    scriptureText: day.scriptureText,
    hebrewGreekStudy: null,
    interactiveElement: { type: 'reflection', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: day.journalPrompt
      ? day.journalPrompt.split('\n').filter(Boolean)
      : [],
    prayer: day.prayer ?? '',
    endnotes: (day.endnotes ?? []).map((n) => ({
      id: n.id,
      source: n.source,
      note: n.note,
    })),
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

function buildContent(): DayContent {
  const onboarding = buildOnboardingDay({
    userResponse: 'I feel scattered and tired.',
    firstDay,
    variant: 'wednesday_3_day',
    onboardingDays: 3,
  })
  return toDayContent(onboarding)
}

describe('onboardingDayContentToModules', () => {
  it('emits scripture → teaching(s) → reflection → prayer in order', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    const types = modules.map((m) => m.type)

    expect(types[0]).toBe('scripture')
    expect(types[types.length - 2]).toBe('reflection')
    expect(types[types.length - 1]).toBe('prayer')
    const teachings = types.filter((t) => t === 'teaching')
    expect(teachings.length).toBeGreaterThanOrEqual(2)
  })

  it('uses the nested-content module shape the ModuleRenderer expects', () => {
    const content = buildContent()
    for (const mod of onboardingDayContentToModules(content)) {
      // ModuleRenderer.normalizeModule reserves the top-level `content` key for
      // a nested object; flat prop fields would be stripped. Every module here
      // must therefore carry an object `content`.
      expect(typeof mod.content).toBe('object')
      expect(mod.content).not.toBeNull()
    }
  })

  it('carries the verbatim anchor verse into the scripture module content', () => {
    const content = buildContent()
    const [scripture] = onboardingDayContentToModules(content)
    expect(scripture.type).toBe('scripture')
    expect(scripture.content.passage).toBe(content.scriptureText)
    expect(scripture.content.reference).toBe(content.scriptureReference)
  })

  it('splits the orientation prose on its **subhead** markers into titled sections', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    const headings = modules
      .filter((m) => m.type === 'teaching')
      .map((m) => m.heading)

    expect(headings).toContain('Sit with the verse above.')
    expect(headings).toContain('What the week ahead will be')
  })

  it('gives the lead teaching section a drop-cap-capable (non-markdown) path', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    const lead = modules.find((m) => m.type === 'teaching')!
    expect(lead.content.markdown).toBe(false)
    // Lead carries NO heading — the reader chrome renders the day title
    // ("Before You Begin") as the H1, so the drop-cap prose flows directly under
    // it. A lead heading here would duplicate the title on the page.
    expect(lead.heading).toBe('')
  })

  it('invents no content — every teaching body is a substring of the source prose', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    for (const mod of modules) {
      if (mod.type !== 'teaching') continue
      const bodyText = mod.content.content as string
      for (const para of bodyText.split('\n\n')) {
        expect(content.textB.includes(para.trim())).toBe(true)
      }
    }
  })

  it('maps the journal prompt into the reflection module', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    const reflection = modules.find((m) => m.type === 'reflection')!
    expect(reflection.content.prompt).toBe(content.reflectionQuestions[0])
  })

  it('maps the prayer verbatim into the prayer module', () => {
    const content = buildContent()
    const modules = onboardingDayContentToModules(content)
    const prayer = modules.find((m) => m.type === 'prayer')!
    expect(prayer.content.prayerText).toBe(content.prayer)
  })

  it('returns an empty array when the day carries no grounded content', () => {
    const empty: DayContent = {
      ...buildContent(),
      scriptureText: '',
      scriptureReference: '',
      textB: '',
      reflectionQuestions: [],
      prayer: '',
    }
    expect(onboardingDayContentToModules(empty)).toEqual([])
  })

  it('only emits module types the catalog ModuleRenderer dispatches', () => {
    const content = buildContent()
    const allowed = new Set(['scripture', 'teaching', 'reflection', 'prayer'])
    for (const mod of onboardingDayContentToModules(content)) {
      expect(allowed.has(mod.type)).toBe(true)
    }
  })
})
