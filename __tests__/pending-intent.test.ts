/**
 * SA-062 — the lock has to actually open.
 *
 * "Locked, not hidden" is only honest if the action a reader reached for
 * completes when they come back. A reader who highlights a line, signs in, and
 * lands on an unmarked page has been told their work was kept and then shown
 * otherwise.
 *
 * The hazards pinned here are the standard pending-intent ones: replay-once,
 * expiry, scope, and — the security judgement that matters most — refusing to
 * replay anything destructive across a redirect the app cannot verify was
 * completed deliberately.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  capturePendingIntent,
  clearPendingIntent,
  consumePendingIntent,
  isReplayable,
} from '@/lib/auth/pending-intent'

const PATH = '/devotional/jabez-day-1'
const HIGHLIGHT = {
  kind: 'highlight' as const,
  devotionalSlug: 'jabez-day-1',
  anchorText: 'the promise was not made to the strong',
  color: 'yellow',
}

beforeEach(() => {
  sessionStorage.clear()
  vi.useRealTimers()
})

describe('replay is one-shot', () => {
  it('returns the intent once and never again', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    expect(consumePendingIntent(PATH)).toMatchObject({ kind: 'highlight' })
    // The second read is the bug. Android names this FLAG_ONE_SHOT; the same
    // reasoning applies to a redirect round trip.
    expect(consumePendingIntent(PATH)).toBeNull()
  })

  it('clears even when it declines to replay', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    // Wrong page: declined AND cleared, so it cannot fire somewhere later.
    expect(consumePendingIntent('/devotional/other-day-1')).toBeNull()
    expect(consumePendingIntent(PATH)).toBeNull()
    expect(sessionStorage.getItem('euangelion:pending-intent')).toBeNull()
  })
})

describe('replay is scoped and time-limited', () => {
  it('only replays on the page it was captured for', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    expect(consumePendingIntent('/library')).toBeNull()
  })

  it('expires after ten minutes', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    const raw = JSON.parse(sessionStorage.getItem('euangelion:pending-intent')!)
    raw.at = Date.now() - 11 * 60_000
    sessionStorage.setItem('euangelion:pending-intent', JSON.stringify(raw))
    // An abandoned tab must not act on its own an hour later.
    expect(consumePendingIntent(PATH)).toBeNull()
  })

  it('survives a round trip inside the window', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    const raw = JSON.parse(sessionStorage.getItem('euangelion:pending-intent')!)
    raw.at = Date.now() - 9 * 60_000
    sessionStorage.setItem('euangelion:pending-intent', JSON.stringify(raw))
    expect(consumePendingIntent(PATH)).not.toBeNull()
  })
})

describe('only additive intents replay', () => {
  it('replays the things a reader can undo', () => {
    expect(isReplayable({ kind: 'save', devotionalSlug: 'x' })).toBe(true)
    expect(isReplayable(HIGHLIGHT)).toBe(true)
    expect(isReplayable({ kind: 'journal', devotionalSlug: 'x' })).toBe(true)
  })

  it('REFUSES destructive intents', () => {
    // A redirect is an untrusted boundary — the app cannot know the reader
    // completed it deliberately. Replaying a create makes something they can
    // undo; replaying a delete destroys something they cannot.
    expect(isReplayable({ kind: 'unsave', devotionalSlug: 'x' })).toBe(false)
    expect(
      isReplayable({
        kind: 'restart_archive',
        seriesSlug: 'x',
        from: 'day_1',
      }),
    ).toBe(false)
  })

  it('never even stores a destructive intent', () => {
    capturePendingIntent({ kind: 'unsave', devotionalSlug: 'x' }, PATH)
    expect(sessionStorage.getItem('euangelion:pending-intent')).toBeNull()
  })
})

describe('storage choice', () => {
  it('uses sessionStorage so the intent dies with the tab', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    expect(sessionStorage.getItem('euangelion:pending-intent')).not.toBeNull()
    // localStorage would replay something reached for last Tuesday.
    expect(localStorage.getItem('euangelion:pending-intent')).toBeNull()
  })

  it('stores no journal text — Art. 9 data does not cross the front channel', () => {
    capturePendingIntent(
      { kind: 'journal', devotionalSlug: 'jabez-day-1' },
      PATH,
    )
    const raw = sessionStorage.getItem('euangelion:pending-intent') ?? ''
    // The intent reopens the field; it never carries what was written.
    expect(raw).not.toMatch(/body|content|text.*:/i)
    expect(raw).toContain('jabez-day-1')
  })

  it('can be dropped when the reader cancels', () => {
    capturePendingIntent(HIGHLIGHT, PATH)
    clearPendingIntent()
    expect(consumePendingIntent(PATH)).toBeNull()
  })
})
