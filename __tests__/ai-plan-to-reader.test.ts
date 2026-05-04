import { describe, expect, it } from 'vitest'
import {
  aiPlanDayToReader,
  resolveDayModules,
} from '@/lib/soul-audit/ai-plan-to-reader'
import type { CustomPlanDay, DevotionalModule } from '@/types/soul-audit'

const baseDay: CustomPlanDay = {
  day: 1,
  dayType: 'devotional',
  title: 'When the noise will not stop',
  scriptureReference: 'Psalm 46:10',
  scriptureText: 'Be still, and know that I am God.',
  reflection:
    'The world is loud. The mind is louder.\n\nGod meets us in the silence we resist.',
  prayer: 'Lord, quiet me. Teach me to wait. Slow my heart toward Yours.',
  nextStep: 'Sit in silence for two minutes today.',
  journalPrompt: 'What noise is hardest for you to step away from?',
}

describe('aiPlanDayToReader', () => {
  it('emits scripture, teaching, and prayer modules from a fully populated day', () => {
    const modules = aiPlanDayToReader(baseDay)
    const types = modules.map((m) => m.type)
    expect(types).toEqual(['scripture', 'teaching', 'prayer'])
  })

  it('puts scripture passage and reference into the scripture module content', () => {
    const [scripture] = aiPlanDayToReader(baseDay)
    expect(scripture.type).toBe('scripture')
    expect(scripture.content.passage).toBe(baseDay.scriptureText)
    expect(scripture.content.reference).toBe(baseDay.scriptureReference)
  })

  it('preserves paragraph structure from the reflection field', () => {
    const modules = aiPlanDayToReader(baseDay)
    const teaching = modules.find((m) => m.type === 'teaching')!
    expect(typeof teaching.content.content).toBe('string')
    const text = teaching.content.content as string
    expect(text.split('\n\n').length).toBeGreaterThanOrEqual(2)
  })

  it('puts prayer text into prayerText so PrayerModule renders it', () => {
    const modules = aiPlanDayToReader(baseDay)
    const prayer = modules.find((m) => m.type === 'prayer')!
    expect(prayer.content.prayerText).toBe(baseDay.prayer)
  })

  it('skips modules whose source field is empty', () => {
    const partial: CustomPlanDay = {
      ...baseDay,
      reflection: '',
      prayer: '   ',
    }
    const types = aiPlanDayToReader(partial).map((m) => m.type)
    expect(types).toEqual(['scripture'])
  })

  it('returns empty array when no fields are present', () => {
    const empty: CustomPlanDay = {
      day: 1,
      title: '',
      scriptureReference: '',
      scriptureText: '',
      reflection: '',
      prayer: '',
      nextStep: '',
      journalPrompt: '',
    }
    expect(aiPlanDayToReader(empty)).toEqual([])
  })

  it('emits only types that exist in the DevotionalModuleType union', () => {
    const allowedTypes = new Set([
      'scripture',
      'teaching',
      'vocab',
      'story',
      'insight',
      'bridge',
      'reflection',
      'comprehension',
      'takeaway',
      'prayer',
      'profile',
      'resource',
    ])
    const modules = aiPlanDayToReader(baseDay)
    for (const mod of modules) {
      expect(allowedTypes.has(mod.type)).toBe(true)
    }
  })
})

describe('resolveDayModules', () => {
  it('prefers natively-populated modules over the adapter', () => {
    const native: DevotionalModule = {
      type: 'teaching',
      heading: 'CURATED',
      content: { content: 'Curated teaching body.' },
    }
    const day: CustomPlanDay = {
      ...baseDay,
      modules: [native],
    }
    const resolved = resolveDayModules(day)
    expect(resolved).toHaveLength(1)
    expect(resolved[0]).toBe(native)
  })

  it('falls back to the adapter when modules are absent', () => {
    const resolved = resolveDayModules(baseDay)
    expect(resolved.length).toBeGreaterThan(0)
    expect(resolved.map((m) => m.type)).toContain('scripture')
  })

  it('falls back to the adapter when modules are an empty array', () => {
    const day: CustomPlanDay = { ...baseDay, modules: [] }
    const resolved = resolveDayModules(day)
    expect(resolved.length).toBeGreaterThan(0)
  })
})
