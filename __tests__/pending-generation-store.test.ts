import { beforeEach, describe, expect, it } from 'vitest'
import {
  HELD_SELECTION_TTL_MS,
  isHeldSelectionFresh,
  usePendingGenerationStore,
  type HeldGenerationSelection,
} from '@/stores/pendingGenerationStore'

const STORAGE_KEY = 'euangelion-pending-generation'

const baseSelection = {
  auditRunId: 'run-123',
  optionId: 'option-abc',
  runToken: 'token-xyz',
  optionTitle: 'Rest for the weary',
  optionVerse: 'Matthew 11:28',
  optionVerseText: 'Come to Me, all you who are weary and burdened.',
  crisisAcknowledged: false,
  analyticsOptIn: false,
  devotionalDepthPreference: 'short_5_7',
  timezone: 'America/New_York',
  timezoneOffsetMinutes: 240,
} satisfies Omit<HeldGenerationSelection, 'heldAt'>

function heldWithAge(ageMs: number): HeldGenerationSelection {
  return {
    ...baseSelection,
    heldAt: new Date(Date.now() - ageMs).toISOString(),
  }
}

beforeEach(() => {
  localStorage.clear()
  usePendingGenerationStore.setState({
    held: null,
    lastCheckoutSessionId: null,
  })
})

describe('holdSelection', () => {
  it('stores the selection with a heldAt timestamp', () => {
    usePendingGenerationStore.getState().holdSelection(baseSelection)
    const { held } = usePendingGenerationStore.getState()
    expect(held).not.toBeNull()
    expect(held?.auditRunId).toBe('run-123')
    expect(held?.optionId).toBe('option-abc')
    expect(held?.runToken).toBe('token-xyz')
    expect(held?.optionTitle).toBe('Rest for the weary')
    expect(Number.isNaN(new Date(held!.heldAt).getTime())).toBe(false)
  })

  it('persists to localStorage so the hold survives a fresh tab', () => {
    usePendingGenerationStore.getState().holdSelection(baseSelection)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as {
      state: { held: HeldGenerationSelection | null }
    }
    expect(parsed.state.held?.optionId).toBe('option-abc')
  })

  it('replaces a previous hold — only one request is ever held', () => {
    usePendingGenerationStore.getState().holdSelection(baseSelection)
    usePendingGenerationStore
      .getState()
      .holdSelection({ ...baseSelection, optionId: 'option-def' })
    expect(usePendingGenerationStore.getState().held?.optionId).toBe(
      'option-def',
    )
  })
})

describe('readFreshSelection', () => {
  it('returns a fresh hold intact', () => {
    usePendingGenerationStore.getState().holdSelection(baseSelection)
    const fresh = usePendingGenerationStore.getState().readFreshSelection()
    expect(fresh?.auditRunId).toBe('run-123')
    // Reading does not consume the hold.
    expect(usePendingGenerationStore.getState().held).not.toBeNull()
  })

  it('returns null when nothing is held', () => {
    expect(usePendingGenerationStore.getState().readFreshSelection()).toBeNull()
  })

  it('clears and returns null when the hold has expired', () => {
    usePendingGenerationStore.setState({
      held: heldWithAge(HELD_SELECTION_TTL_MS + 1_000),
    })
    expect(usePendingGenerationStore.getState().readFreshSelection()).toBeNull()
    expect(usePendingGenerationStore.getState().held).toBeNull()
  })

  it('clears and returns null when heldAt is unparseable', () => {
    usePendingGenerationStore.setState({
      held: { ...baseSelection, heldAt: 'garbage' },
    })
    expect(usePendingGenerationStore.getState().readFreshSelection()).toBeNull()
    expect(usePendingGenerationStore.getState().held).toBeNull()
  })
})

describe('clearSelection', () => {
  it('drops the hold but keeps the checkout session id', () => {
    usePendingGenerationStore.getState().holdSelection(baseSelection)
    usePendingGenerationStore
      .getState()
      .setLastCheckoutSessionId('cs_test_abc123')
    usePendingGenerationStore.getState().clearSelection()
    const state = usePendingGenerationStore.getState()
    expect(state.held).toBeNull()
    expect(state.lastCheckoutSessionId).toBe('cs_test_abc123')
  })
})

describe('setLastCheckoutSessionId', () => {
  it('stores and clears the most recent checkout session id', () => {
    usePendingGenerationStore
      .getState()
      .setLastCheckoutSessionId('cs_live_xyz789')
    expect(usePendingGenerationStore.getState().lastCheckoutSessionId).toBe(
      'cs_live_xyz789',
    )
    usePendingGenerationStore.getState().setLastCheckoutSessionId(null)
    expect(
      usePendingGenerationStore.getState().lastCheckoutSessionId,
    ).toBeNull()
  })
})

describe('isHeldSelectionFresh', () => {
  it('rejects null and invalid timestamps', () => {
    expect(isHeldSelectionFresh(null)).toBe(false)
    expect(
      isHeldSelectionFresh({ ...baseSelection, heldAt: 'not-a-date' }),
    ).toBe(false)
  })

  it('accepts a hold within the TTL and rejects one beyond it', () => {
    expect(isHeldSelectionFresh(heldWithAge(60_000))).toBe(true)
    expect(
      isHeldSelectionFresh(heldWithAge(HELD_SELECTION_TTL_MS + 60_000)),
    ).toBe(false)
  })
})
