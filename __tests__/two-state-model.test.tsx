/**
 * SA-062 — two site states.
 *
 * Founder, 2026-08-16: "Need two site states — one for signed in and one not
 * signed in. Having an account enables notes, saving features, highlights etc.
 * No account, data should not be retained… The unsigned in state simply is a
 * reader, non-interactive and non saving."
 *
 * Scoped to NON-SAVING, not non-interactive (founder-accepted amendment): the
 * catalog stays fully readable and listenable signed out, because that is what
 * earns the account. What changes is that nothing the reader AUTHORS is kept
 * anywhere — not the database, not localStorage, not a session-keyed row.
 *
 * This REVERSES three prior founder rulings, deliberately:
 *   SA-018 (as amended) — anonymous bookmarks
 *   SA-038 §2           — "an account decides persistence, not visibility"
 *   SA-039 §5           — device-kept highlights in localStorage
 *
 * SA-026 is NOT reversed: Soul Audit stays anonymous and free.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  // jsdom implements Range but not its layout methods, so the selection
  // handler throws on mouseUp. The assertions still held, but an unhandled
  // error in the run can mask a real one — so give the Range a box.
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ top: 300, bottom: 320, left: 100, width: 200, height: 20 }) as DOMRect
    Range.prototype.getClientRects = (() => []) as unknown as never
  }
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (String(url).startsWith('/api/annotations') && !init?.method) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ annotations: [] }),
      } as Response)
    }
    // Every write is refused, which is what a signed-out reader gets.
    return Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ code: 'AUTH_REQUIRED_SAVE_STATE' }),
    } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function seedSelection() {
  const root = document.createElement('div')
  root.id = 'main-content'
  root.innerHTML = '<p>the promise was not made to the strong at all</p>'
  document.body.appendChild(root)

  const textNode = root.querySelector('p')!.firstChild as Text
  const range = document.createRange()
  range.setStart(textNode, 4)
  range.setEnd(textNode, 40)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
  return root
}

describe('signed out retains nothing the reader authored', () => {
  it('writes no highlight to localStorage', () => {
    seedSelection()
    render(<TextHighlightTrigger devotionalSlug="jabez-day-1" />)
    fireEvent.mouseUp(document)

    const highlight = screen.queryByRole('button', { name: /^highlight$/i })
    if (highlight) fireEvent.click(highlight)

    // SA-039 §5 reversed: there is no device-kept state any more.
    expect(localStorage.getItem('euangelion-local-highlights-v1')).toBeNull()
    expect(Object.keys(localStorage)).not.toContain(
      'euangelion-local-highlights-v1',
    )
  })

  it('has removed the device-kept code path entirely, not just its callers', () => {
    // A dormant writer is a bug waiting to be re-wired. Source-text assertion
    // because an unused function is invisible to a runtime test.
    const source = readFileSync(
      'src/components/TextHighlightTrigger.tsx',
      'utf8',
    )
    expect(source).not.toContain('LOCAL_HIGHLIGHTS_KEY')
    expect(source).not.toContain('writeLocalHighlight')
    expect(source).not.toContain('readLocalHighlights')
    expect(source).not.toContain('mutateLocalHighlight')
  })
})

describe('the API refuses anonymous writes', () => {
  it('bookmarks require an account on every method', () => {
    const source = readFileSync('src/app/api/bookmarks/route.ts', 'utf8')
    // SA-018's amendment allowed anonymous bookmarks keyed by audit session
    // token. SA-062 reverses that, so no handler may fall back to a session
    // token when there is no user.
    expect(source).not.toContain('getOrCreateAuditSessionToken')
    // Each of the three handlers gates.
    const gates = source.match(/AUTH_REQUIRED_SAVE_STATE/g) ?? []
    expect(gates.length).toBeGreaterThanOrEqual(3)
  })
})
