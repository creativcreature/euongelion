/**
 * SA-059 — one field for every kind of writing.
 *
 * The catalog ships 2,062 journal prompts (545 reflection modules carrying
 * 1,517 additional questions) and not one of them has ever had anywhere to
 * write an answer. This is that field, and it is deliberately ONE component:
 * reflection answers, a prayer written alongside, a free entry and a note on a
 * highlight are the same act with different framing.
 *
 * WHY AUTH IS RESOLVED ON THE CLIENT. `/devotional/[slug]` is statically
 * generated — `generateStaticParams()` plus `revalidate = 3600`. Reading
 * `getUser()` in the server component would force all ~568 devotional pages
 * dynamic, destroying ISR on precisely the surface SA-060 keeps open to
 * signed-out readers for SEO and sharing. So the provider resolves auth after
 * mount, and the field FAILS CLOSED until it knows: an input that might not
 * save is worse than a moment of a locked control.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  ReaderProvider,
  __resetSessionProbe,
} from '@/components/reader/ReaderContext'
import JournalField from '@/components/reader/JournalField'
import { useAuthStore } from '@/stores/authStore'

let fetchMock: ReturnType<typeof vi.fn>

/** Route responses, overridable per test. */
function mockRoutes(options: { signedIn: boolean; saveOk?: boolean }) {
  fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.startsWith('/api/auth/session')) {
      // Mirrors the real route exactly: it returns `authenticated` alongside
      // `user`, and the provider reads `authenticated`. An earlier version of
      // this mock returned only `user` and every signed-in case failed — the
      // mock was wrong, not the component.
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            authenticated: options.signedIn,
            user: options.signedIn ? { id: 'u1', email: null } : null,
          }),
      } as Response)
    }
    if (url.startsWith('/api/annotations') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ annotations: [] }),
      } as Response)
    }
    const ok = options.saveOk !== false
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () =>
        Promise.resolve(ok ? { ok: true, annotation: { id: 'a1' } } : {}),
    } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
}

const wrap = () => (
  <ReaderProvider devotionalSlug="looking-at-the-sun-day-1">
    <JournalField
      kind="reflection"
      anchorKey="m3:q0"
      label="Your answer"
      placeholder="Write…"
    />
  </ReaderProvider>
)

beforeEach(() => {
  localStorage.clear()
  // Both caches are module-level and outlive a render — deliberately, so one
  // page load costs one session probe no matter how many modules ask. Tests
  // have to clear them or every case after the first inherits the first's
  // answer.
  __resetSessionProbe()
  useAuthStore.setState({ userId: null, email: null, initialized: false })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/**
 * Writes only. Matched on an EXPLICIT POST/PATCH rather than "not GET" — the
 * hydration read passes no `method` at all, so `method !== 'GET'` counted it as
 * a write and every assertion here was off by one.
 */
const annotationWrites = () =>
  fetchMock.mock.calls.filter(([url, init]) => {
    if (!String(url).startsWith('/api/annotations')) return false
    const method = (init as RequestInit | undefined)?.method
    return method === 'POST' || method === 'PATCH'
  })

describe('JournalField, signed in', () => {
  beforeEach(() => mockRoutes({ signedIn: true }))

  it('saves on blur, as a note keyed to its question', async () => {
    render(wrap())
    const box = await screen.findByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'He kept his word.' } })
    fireEvent.blur(box)

    await waitFor(() => expect(annotationWrites()).toHaveLength(1))
    const body = JSON.parse(
      (annotationWrites()[0][1] as RequestInit).body as string,
    )
    expect(body.annotationType).toBe('note')
    expect(body.style.kind).toBe('reflection')
    // The anchor is how an answer finds its question again on reload.
    expect(body.style.anchorKey).toBe('m3:q0')
    expect(body.body).toBe('He kept his word.')
  })

  it('does not write an empty answer', async () => {
    render(wrap())
    const box = await screen.findByLabelText('Your answer')
    fireEvent.change(box, { target: { value: '   ' } })
    fireEvent.blur(box)
    await new Promise((r) => setTimeout(r, 20))
    expect(annotationWrites()).toHaveLength(0)
  })

  it('reports a failed save on the control rather than dropping it', async () => {
    mockRoutes({ signedIn: true, saveOk: false })
    render(wrap())
    const box = await screen.findByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'Something' } })
    fireEvent.blur(box)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/couldn.t save/i),
    )
  })

  it('confirms a successful save', async () => {
    render(wrap())
    const box = await screen.findByLabelText('Your answer')
    fireEvent.change(box, { target: { value: 'Kept' } })
    fireEvent.blur(box)
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toMatch(/saved/i),
    )
  })
})

describe('JournalField, signed out', () => {
  beforeEach(() => mockRoutes({ signedIn: false }))

  it('is visible but locked, and writes nothing', async () => {
    render(wrap())
    // Locked, NOT hidden (SA-060 §2.6): a control that vanishes never teaches
    // the reader the product does this, and loses the best conversion moment
    // there is — someone moved by a line, reaching to mark it.
    expect(
      await screen.findByRole('button', { name: /sign in to write/i }),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Your answer')).toBeNull()
    expect(annotationWrites()).toHaveLength(0)
  })

  it('keeps nothing on the device', async () => {
    render(wrap())
    await screen.findByRole('button', { name: /sign in to write/i })
    // SA-060 reverses SA-039 §5: there is no device-kept state any more.
    expect(Object.keys(localStorage)).toHaveLength(0)
  })
})

describe('JournalField, before auth is known', () => {
  it('fails closed rather than offering an input that might not save', () => {
    // The session request never resolves, so the component stays in its
    // initial state — which must be the locked one.
    fetchMock = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    render(wrap())
    expect(screen.queryByLabelText('Your answer')).toBeNull()
  })
})
