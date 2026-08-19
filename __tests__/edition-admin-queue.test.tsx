/**
 * SA-090 / F-136 — the edition review queue in admin.
 *
 * The queue is where invented voice and third-party items stop before they
 * reach the paper, so the properties worth protecting are: what a reviewer can
 * see (grouped by edition date, labelled by kind), what a click actually sends,
 * and — the one that matters most (Development Rule 1) — that a broken read
 * looks broken. An empty list and a failed fetch must never render the same.
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EditionQueueClient from '@/app/admin/edition/EditionQueueClient'

const PRACTICE_ID = '11111111-1111-4111-8111-111111111111'
const STRIP_ID = '22222222-2222-4222-8222-222222222222'
const SCREENING_ID = '33333333-3333-4333-8333-333333333333'
const NOTICE_ID = '44444444-4444-4444-8444-444444444444'

function queueFixture() {
  return [
    {
      id: PRACTICE_ID,
      kind: 'practice',
      publishDate: '2026-08-18',
      slot: 0,
      status: 'draft',
      payload: {
        instruction: 'Read Psalm 62 aloud, slowly, once.',
        reason: 'The psalm argues with itself before it settles.',
        duration: 'Four minutes',
      },
    },
    {
      id: STRIP_ID,
      kind: 'strip',
      publishDate: '2026-08-18',
      slot: 1,
      status: 'draft',
      payload: {
        image: '/images/strip/ninety-nine-004.webp',
        alt: 'The flock watches the shepherd leave.',
        caption: 'He counted us twice. Then he left anyway.',
        panelId: '004',
      },
    },
    {
      id: SCREENING_ID,
      kind: 'screening',
      publishDate: '2026-08-19',
      slot: 0,
      status: 'draft',
      payload: {
        title: 'What is the Book of Lamentations?',
        kind: 'video',
        sourceName: 'BibleProject',
        sourceUrl: 'https://example.org/lamentations',
        videoId: 'yTGEMoamLGM',
        thumbnail: 'https://example.org/thumbs/lamentations.jpg',
        blurb: 'Five poems written over the ruins of a city that fell.',
      },
      sourceName: 'BibleProject',
      sourceUrl: 'https://example.org/lamentations',
    },
    {
      id: NOTICE_ID,
      kind: 'notice',
      publishDate: '2026-08-19',
      slot: 1,
      status: 'draft',
      payload: {
        title: 'Compline, Thursdays',
        body: 'Night prayer at eight, in the side chapel.',
        by: 'St Mary’s, Bristol',
        href: 'https://example.org/compline',
      },
    },
  ]
}

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as Response
}

/** GET returns `items`; POST resolves ok. Returns the mock so tests can read
 *  exactly what was sent. */
function mockFetch(items: unknown[]) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse({ ok: true })
      }
      return jsonResponse({ ok: true, items })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function postBodies(fetchMock: ReturnType<typeof mockFetch>) {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(
      ([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>,
    )
}

describe('Edition review queue (SA-090 / F-136)', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('groups drafts by publish date and labels each by kind', async () => {
    mockFetch(queueFixture())
    render(<EditionQueueClient />)

    const firstDay = await screen.findByTestId('edition-group-2026-08-18')
    const secondDay = screen.getByTestId('edition-group-2026-08-19')

    expect(within(firstDay).getByText('PRACTICE')).toBeInTheDocument()
    expect(within(firstDay).getByText('STRIP')).toBeInTheDocument()
    expect(within(firstDay).queryByText('SCREENING')).toBeNull()
    expect(within(secondDay).getByText('SCREENING')).toBeInTheDocument()

    // Kind-aware summaries: the reviewer sees the thing being reviewed.
    expect(
      screen.getByText('Read Psalm 62 aloud, slowly, once.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('He counted us twice. Then he left anyway.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'https://example.org/lamentations' }),
    ).toHaveAttribute('href', 'https://example.org/lamentations')
  })

  it('approve POSTs the published verdict and removes the card', async () => {
    const fetchMock = mockFetch(queueFixture())
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${PRACTICE_ID}`)
    await user.click(within(card).getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(
        screen.queryByTestId(`edition-item-${PRACTICE_ID}`),
      ).not.toBeInTheDocument()
    })

    expect(postBodies(fetchMock)).toEqual([
      { id: PRACTICE_ID, verdict: 'published' },
    ])
    // The rest of the queue survives.
    expect(screen.getByTestId(`edition-item-${STRIP_ID}`)).toBeInTheDocument()
  })

  it('reject POSTs the rejected verdict', async () => {
    const fetchMock = mockFetch(queueFixture())
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${STRIP_ID}`)
    await user.click(within(card).getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(
        screen.queryByTestId(`edition-item-${STRIP_ID}`),
      ).not.toBeInTheDocument()
    })

    expect(postBodies(fetchMock)).toEqual([
      { id: STRIP_ID, verdict: 'rejected' },
    ])
  })

  it('bulk approve confirms once, then publishes everything shown', async () => {
    const fetchMock = mockFetch(queueFixture())
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const bulk = await screen.findByRole('button', {
      name: 'Approve all shown',
    })
    await user.click(bulk)

    // First click arms it; nothing has been sent.
    expect(postBodies(fetchMock)).toHaveLength(0)
    const armed = await screen.findByRole('button', {
      name: 'Really approve 4?',
    })
    await user.click(armed)

    await waitFor(() => {
      expect(postBodies(fetchMock)).toHaveLength(4)
    })
    expect(postBodies(fetchMock).every((b) => b.verdict === 'published')).toBe(
      true,
    )
    expect(await screen.findByText('NOTHING WAITING')).toBeInTheDocument()
  })

  it('a failed fetch renders the error, never an empty queue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { error: 'edition read failed for 2026-08-18: connection refused' },
          { ok: false, status: 500 },
        ),
      ),
    )
    render(<EditionQueueClient />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'edition read failed for 2026-08-18: connection refused',
    )
    expect(alert).toHaveTextContent('THE QUEUE DID NOT LOAD')
    // The failure must not be dressed as an empty queue.
    expect(screen.queryByText('NOTHING WAITING')).toBeNull()
  })

  it('a thrown fetch surfaces its message rather than resolving to empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('NetworkError: failed to fetch')
      }),
    )
    render(<EditionQueueClient />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('NetworkError: failed to fetch')
    expect(screen.queryByText('NOTHING WAITING')).toBeNull()
  })

  it('an empty queue says so explicitly', async () => {
    mockFetch([])
    render(<EditionQueueClient />)

    expect(await screen.findByText('NOTHING WAITING')).toBeInTheDocument()
    expect(
      screen.getByText(/Every drafted section has a verdict/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the WHOLE third-party item: blurb, thumbnail, video id and link', async () => {
    // Approving a screening you cannot see is approving somebody else's video
    // sight-unseen. Everything that will reach the page has to be on the card.
    mockFetch(queueFixture())
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${SCREENING_ID}`)
    expect(
      within(card).getByText(
        'Five poems written over the ruins of a city that fell.',
      ),
    ).toBeInTheDocument()
    expect(within(card).getByText(/yTGEMoamLGM/)).toBeInTheDocument()

    const thumb = within(card).getByRole('img')
    expect(thumb).toHaveAttribute(
      'src',
      'https://example.org/thumbs/lamentations.jpg',
    )
    expect(
      within(card).getByRole('link', {
        name: 'https://example.org/lamentations',
      }),
    ).toHaveAttribute('href', 'https://example.org/lamentations')
  })

  it('shows a notice’s destination as a real link, not buried text', async () => {
    mockFetch(queueFixture())
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${NOTICE_ID}`)
    expect(
      within(card).getByRole('link', { name: 'https://example.org/compline' }),
    ).toHaveAttribute('href', 'https://example.org/compline')
  })

  it('bulk approve clears each card only after ITS post succeeds, and stops on the first failure', async () => {
    // The dangerous version empties the list before the loop: an admin who
    // closes the tab mid-run is left believing a queue they never finished.
    let posts = 0
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          posts += 1
          if (posts === 2) {
            return jsonResponse(
              { error: 'edition write failed: connection refused' },
              { ok: false, status: 500 },
            )
          }
          return jsonResponse({ ok: true })
        }
        return jsonResponse({ ok: true, items: queueFixture() })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    await user.click(
      await screen.findByRole('button', { name: 'Approve all shown' }),
    )
    await user.click(
      await screen.findByRole('button', { name: 'Really approve 4?' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('connection refused')
    expect(alert).toHaveTextContent('Stopped after 1 of 4.')

    // The loop stopped at the failure — items 3 and 4 were never sent.
    expect(postBodies(fetchMock)).toHaveLength(2)
    // Only the card whose own post succeeded is gone. Everything still
    // unreviewed is still on screen.
    expect(
      screen.queryByTestId(`edition-item-${PRACTICE_ID}`),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId(`edition-item-${STRIP_ID}`)).toBeInTheDocument()
    expect(
      screen.getByTestId(`edition-item-${SCREENING_ID}`),
    ).toBeInTheDocument()
    expect(screen.getByTestId(`edition-item-${NOTICE_ID}`)).toBeInTheDocument()
    expect(screen.queryByText('NOTHING WAITING')).toBeNull()
  })

  it('a 409 re-reads the queue instead of quietly removing the card', async () => {
    // The row was reviewed somewhere else, so this verdict changed nothing.
    // The card's fate is decided by the re-read, never by the optimistic
    // removal that has already happened on screen.
    const remaining = queueFixture().filter((item) => item.id !== PRACTICE_ID)
    let gets = 0
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return jsonResponse(
            { error: 'Already reviewed', code: 'ALREADY_REVIEWED' },
            { ok: false, status: 409 },
          )
        }
        gets += 1
        return jsonResponse({
          ok: true,
          items: gets === 1 ? queueFixture() : remaining,
        })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${PRACTICE_ID}`)
    await user.click(within(card).getByRole('button', { name: 'Approve' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('already been reviewed somewhere else')
    expect(gets).toBe(2)
    // What is on screen now is exactly what the database just said.
    expect(
      screen.queryByTestId(`edition-item-${PRACTICE_ID}`),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId(`edition-item-${STRIP_ID}`)).toBeInTheDocument()
  })

  it('a 409 whose re-read also fails puts the card BACK and says the list may be stale', async () => {
    let gets = 0
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return jsonResponse(
            { error: 'Already reviewed' },
            { ok: false, status: 409 },
          )
        }
        gets += 1
        if (gets > 1) {
          return jsonResponse(
            { error: 'review queue read failed: connection refused' },
            { ok: false, status: 500 },
          )
        }
        return jsonResponse({ ok: true, items: queueFixture() })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${PRACTICE_ID}`)
    await user.click(within(card).getByRole('button', { name: 'Approve' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('already been reviewed somewhere else')
    expect(alert).toHaveTextContent('may be stale')
    expect(alert).toHaveTextContent('connection refused')
    expect(
      screen.getByTestId(`edition-item-${PRACTICE_ID}`),
    ).toBeInTheDocument()
  })

  it('a failed verdict restores the card and shows why', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return jsonResponse(
            { error: 'review update failed: row is no longer a draft' },
            { ok: false, status: 500 },
          )
        }
        return jsonResponse({ ok: true, items: queueFixture() })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<EditionQueueClient />)

    const card = await screen.findByTestId(`edition-item-${PRACTICE_ID}`)
    await user.click(within(card).getByRole('button', { name: 'Approve' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('row is no longer a draft')
    expect(
      screen.getByTestId(`edition-item-${PRACTICE_ID}`),
    ).toBeInTheDocument()
  })
})
