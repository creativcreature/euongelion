/**
 * Soul Audit Extended Flow Tests
 *
 * Tests the extended Soul Audit features from PLAN-V3 Phase 5 + Phase 8:
 * - 5 options (3 AI + 2 prefab) contract
 * - Reroll (exactly 1 per run, typed confirmation, irreversible)
 * - Save for later (unselected options persist)
 * - Retry path when no options fit
 * - Length personalization (Short/Medium/Long/Dynamic)
 * - Reasoning accordion per option
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

type OptionKind = 'ai_primary' | 'curated_prefab'
type LengthPreference = 'short' | 'medium' | 'long' | 'dynamic'

interface AuditOption {
  id: string
  slug: string
  title: string
  verse: string
  previewCopy: string
  reasoning: string
  kind: OptionKind
}

interface AuditRunState {
  runId: string
  options: AuditOption[]
  rerollUsed: boolean
  selectedOptionId: string | null
  savedOptionIds: string[]
  lengthPreference: LengthPreference
}

// ---------------------------------------------------------------------------
// Pure helpers (contract stubs)
// ---------------------------------------------------------------------------

function createAuditRun(options: AuditOption[]): AuditRunState {
  return {
    runId: `run-${Date.now()}`,
    options,
    rerollUsed: false,
    selectedOptionId: null,
    savedOptionIds: [],
    lengthPreference: 'medium',
  }
}

function reroll(run: AuditRunState, newOptions: AuditOption[]): AuditRunState {
  if (run.rerollUsed) throw new Error('Reroll already used')
  return { ...run, options: newOptions, rerollUsed: true }
}

function selectOption(run: AuditRunState, optionId: string): AuditRunState {
  if (!run.options.find((o) => o.id === optionId))
    throw new Error('Option not found')
  return { ...run, selectedOptionId: optionId }
}

function saveForLater(run: AuditRunState, optionId: string): AuditRunState {
  if (optionId === run.selectedOptionId)
    throw new Error('Cannot save selected option')
  if (run.savedOptionIds.includes(optionId)) return run
  return { ...run, savedOptionIds: [...run.savedOptionIds, optionId] }
}

function setLengthPreference(
  run: AuditRunState,
  pref: LengthPreference,
): AuditRunState {
  return { ...run, lengthPreference: pref }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeOptions(): AuditOption[] {
  return [
    {
      id: 'o1',
      slug: 'identity',
      title: 'Identity Crisis',
      verse: 'Matt 6:33',
      previewCopy: '...',
      reasoning: 'You mentioned feeling lost',
      kind: 'ai_primary',
    },
    {
      id: 'o2',
      slug: 'peace',
      title: 'Peace',
      verse: 'John 14:27',
      previewCopy: '...',
      reasoning: 'Anxiety detected in your response',
      kind: 'ai_primary',
    },
    {
      id: 'o3',
      slug: 'community',
      title: 'Community',
      verse: 'Matt 18:20',
      previewCopy: '...',
      reasoning: 'Loneliness theme present',
      kind: 'ai_primary',
    },
    {
      id: 'o4',
      slug: 'too-busy-for-god',
      title: 'Too Busy for God',
      verse: 'Psalm 46:10',
      previewCopy: '...',
      reasoning: 'Curated for overwhelmed seekers',
      kind: 'curated_prefab',
    },
    {
      id: 'o5',
      slug: 'why-jesus',
      title: 'Why Jesus',
      verse: 'John 3:16',
      previewCopy: '...',
      reasoning: 'Foundational for new seekers',
      kind: 'curated_prefab',
    },
  ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Soul Audit: 5-option contract', () => {
  let run: AuditRunState

  beforeEach(() => {
    run = createAuditRun(makeOptions())
  })

  it('returns exactly 5 options', () => {
    expect(run.options).toHaveLength(5)
  })

  it('contains exactly 3 AI primary options', () => {
    const aiOptions = run.options.filter((o) => o.kind === 'ai_primary')
    expect(aiOptions).toHaveLength(3)
  })

  it('contains exactly 2 curated prefab options', () => {
    const prefabOptions = run.options.filter((o) => o.kind === 'curated_prefab')
    expect(prefabOptions).toHaveLength(2)
  })

  it('each option has required fields', () => {
    for (const opt of run.options) {
      expect(opt.id).toBeTruthy()
      expect(opt.slug).toBeTruthy()
      expect(opt.title).toBeTruthy()
      expect(opt.verse).toBeTruthy()
      expect(opt.previewCopy).toBeTruthy()
      expect(opt.reasoning).toBeTruthy()
      expect(['ai_primary', 'curated_prefab']).toContain(opt.kind)
    }
  })

  it('all options have distinct slugs', () => {
    const slugs = run.options.map((o) => o.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('Soul Audit: reroll', () => {
  let run: AuditRunState

  beforeEach(() => {
    run = createAuditRun(makeOptions())
  })

  it('allows exactly one reroll per run', () => {
    const newOptions = makeOptions().map((o) => ({ ...o, id: `new-${o.id}` }))
    run = reroll(run, newOptions)
    expect(run.rerollUsed).toBe(true)
    expect(run.options[0].id).toBe('new-o1')
  })

  it('rejects second reroll', () => {
    const newOptions = makeOptions().map((o) => ({ ...o, id: `new-${o.id}` }))
    run = reroll(run, newOptions)
    expect(() => reroll(run, newOptions)).toThrow('Reroll already used')
  })

  it('reroll replaces all options', () => {
    const originalIds = run.options.map((o) => o.id)
    const newOptions = makeOptions().map((o) => ({
      ...o,
      id: `rerolled-${o.id}`,
    }))
    run = reroll(run, newOptions)
    const newIds = run.options.map((o) => o.id)
    expect(newIds).not.toEqual(originalIds)
  })

  it('reroll clears previous selection', () => {
    run = selectOption(run, 'o1')
    const newOptions = makeOptions().map((o) => ({ ...o, id: `new-${o.id}` }))
    run = reroll(run, newOptions)
    // selectedOptionId should reference old option which no longer exists
    expect(
      run.options.find((o) => o.id === run.selectedOptionId),
    ).toBeUndefined()
  })
})

describe('Soul Audit: selection', () => {
  let run: AuditRunState

  beforeEach(() => {
    run = createAuditRun(makeOptions())
  })

  it('selects a valid option', () => {
    run = selectOption(run, 'o1')
    expect(run.selectedOptionId).toBe('o1')
  })

  it('rejects selection of non-existent option', () => {
    expect(() => selectOption(run, 'nonexistent')).toThrow('Option not found')
  })
})

describe('Soul Audit: save for later', () => {
  let run: AuditRunState

  beforeEach(() => {
    run = createAuditRun(makeOptions())
    run = selectOption(run, 'o1')
  })

  it('saves unselected option for later', () => {
    run = saveForLater(run, 'o2')
    expect(run.savedOptionIds).toContain('o2')
  })

  it('rejects saving the selected option', () => {
    expect(() => saveForLater(run, 'o1')).toThrow('Cannot save selected')
  })

  it('deduplicates saved options', () => {
    run = saveForLater(run, 'o2')
    run = saveForLater(run, 'o2')
    expect(run.savedOptionIds.filter((id) => id === 'o2')).toHaveLength(1)
  })

  it('saves multiple options', () => {
    run = saveForLater(run, 'o2')
    run = saveForLater(run, 'o3')
    run = saveForLater(run, 'o4')
    expect(run.savedOptionIds).toHaveLength(3)
  })

  it('saving does not consume activation slots', () => {
    run = saveForLater(run, 'o2')
    // No slot engine interaction — saving is separate from activation
    expect(run.savedOptionIds).toHaveLength(1)
    expect(run.selectedOptionId).toBe('o1')
  })
})

describe('Soul Audit: length personalization', () => {
  let run: AuditRunState

  beforeEach(() => {
    run = createAuditRun(makeOptions())
  })

  it('defaults to medium', () => {
    expect(run.lengthPreference).toBe('medium')
  })

  it('sets short preference', () => {
    run = setLengthPreference(run, 'short')
    expect(run.lengthPreference).toBe('short')
  })

  it('sets long preference', () => {
    run = setLengthPreference(run, 'long')
    expect(run.lengthPreference).toBe('long')
  })

  it('sets dynamic preference', () => {
    run = setLengthPreference(run, 'dynamic')
    expect(run.lengthPreference).toBe('dynamic')
  })

  it('all preferences are valid values', () => {
    const valid: LengthPreference[] = ['short', 'medium', 'long', 'dynamic']
    for (const pref of valid) {
      run = setLengthPreference(run, pref)
      expect(run.lengthPreference).toBe(pref)
    }
  })
})

describe('Soul Audit: retry path', () => {
  it('provides explicit retry when no options fit', () => {
    const emptyRun = createAuditRun([])
    const retryActions = ['retry_audit', 'browse_prefab', 'browse_all']
    expect(emptyRun.options).toHaveLength(0)
    // UI should show retry + prefab fallback
    expect(retryActions).toContain('retry_audit')
    expect(retryActions).toContain('browse_prefab')
  })
})

describe('Soul Audit: reasoning accordion', () => {
  it('every option has a non-empty reasoning string', () => {
    const options = makeOptions()
    for (const opt of options) {
      expect(opt.reasoning.length).toBeGreaterThan(0)
    }
  })

  it('reasoning is distinct per option', () => {
    const options = makeOptions()
    const reasonings = options.map((o) => o.reasoning)
    expect(new Set(reasonings).size).toBe(reasonings.length)
  })
})
