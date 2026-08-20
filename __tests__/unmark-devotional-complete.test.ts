/**
 * Undoing a completion.
 *
 * Founder, 2026-08-19: "i accidentally marked one and now cant go back".
 *
 * Marking a day read writes to THREE places — localStorage, the account row,
 * and `active_series.current_day` — and none had an inverse. An action a person
 * can take by accident, on a surface built for one-handed use, needs a way back.
 *
 * The subtle requirement is that removing only locally is WORSE than doing
 * nothing: the next reconcile pulls the completion back and the undo silently
 * un-undoes itself. So these assert the local removal AND that the server calls
 * are attempted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rewind = vi.fn(async () => ({ status: 'advanced' }))
const remove = vi.fn(async () => ({ status: 'saved' }))
const advance = vi.fn(async () => ({ status: 'advanced' }))
const push = vi.fn(async () => ({ status: 'saved' }))

vi.mock('@/lib/reading/active-day', () => ({
  advanceActiveDayAfterCompletion: advance,
  rewindActiveDayAfterUnmark: rewind,
}))
vi.mock('@/lib/reading/reading-progress-sync', () => ({
  READING_PROGRESS_MERGED: 'readingProgressMerged',
  pushReadingCompletion: push,
  removeReadingCompletion: remove,
}))

const KEY = 'wakeup_progress'

async function progressModule() {
  return await import('@/lib/progress')
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
afterEach(() => localStorage.clear())

describe('unmarkDevotionalComplete', () => {
  it('a marked day can be un-marked, and stops reading as read', async () => {
    const {
      markDevotionalComplete,
      unmarkDevotionalComplete,
      isDevotionalRead,
    } = await progressModule()
    markDevotionalComplete('hope-day-1')
    expect(isDevotionalRead('hope-day-1')).toBe(true)

    unmarkDevotionalComplete('hope-day-1')
    expect(isDevotionalRead('hope-day-1')).toBe(false)
  })

  it('leaves other days alone — undo is not a reset', async () => {
    const {
      markDevotionalComplete,
      unmarkDevotionalComplete,
      isDevotionalRead,
    } = await progressModule()
    markDevotionalComplete('hope-day-1')
    markDevotionalComplete('hope-day-2')

    unmarkDevotionalComplete('hope-day-1')
    expect(isDevotionalRead('hope-day-1')).toBe(false)
    expect(isDevotionalRead('hope-day-2')).toBe(true)
  })

  it('reaches the account, because a local-only removal would be undone by the next reconcile', async () => {
    const { markDevotionalComplete, unmarkDevotionalComplete } =
      await progressModule()
    markDevotionalComplete('hope-day-1')
    remove.mockClear()

    unmarkDevotionalComplete('hope-day-1')
    expect(remove).toHaveBeenCalledWith('hope-day-1')
  })

  it('gives the reader back the day they were standing on', async () => {
    const { markDevotionalComplete, unmarkDevotionalComplete } =
      await progressModule()
    markDevotionalComplete('hope-day-1')
    rewind.mockClear()

    unmarkDevotionalComplete('hope-day-1')
    expect(rewind).toHaveBeenCalledWith('hope-day-1')
  })

  it('un-marking something never marked is a quiet no-op, not a spurious write', async () => {
    const { unmarkDevotionalComplete } = await progressModule()
    unmarkDevotionalComplete('hope-day-7')
    expect(remove).not.toHaveBeenCalled()
    expect(rewind).not.toHaveBeenCalled()
  })

  it('survives a reload — the removal is persisted, not just in memory', async () => {
    const { markDevotionalComplete, unmarkDevotionalComplete } =
      await progressModule()
    markDevotionalComplete('hope-day-1')
    unmarkDevotionalComplete('hope-day-1')
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    expect(stored.some((r: { slug: string }) => r.slug === 'hope-day-1')).toBe(
      false,
    )
  })
})
