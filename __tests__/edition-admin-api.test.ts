import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * SA-090 / F-136 — /api/admin/edition, the verdict endpoint.
 *
 * This route is the only way a drafted section becomes a published one, so the
 * properties worth pinning are the gate and the honesty of the answer:
 *
 *   - no session, or an email outside ADMIN_EMAIL_ALLOWLIST, never reaches the
 *     store — and an UNSET or EMPTY allowlist means there are no admins at all,
 *     not that everyone is one (fail closed);
 *   - a malformed id or verdict is refused before the database sees it;
 *   - a verdict that moved NO row answers 409, never 200. A row already
 *     reviewed elsewhere is the one case where "success" would be a lie, and
 *     the admin would go on believing they had rejected something the paper is
 *     about to print (Development Rule 1).
 */

let authedUser: { id: string; email?: string } | null = null
let authError: { message: string } | null = null

const getReviewQueue = vi.fn(async () => [] as unknown[])
const reviewEditionItem = vi.fn(async () => true)
const getEditionItem = vi.fn(async (): Promise<unknown> => null)
const updateEditionItemPayload = vi.fn(async () => true)

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () =>
          Promise.resolve({ data: { user: authedUser }, error: authError }),
      },
    }),
}))

vi.mock('@/lib/edition/store', () => ({
  getReviewQueue: () => getReviewQueue(),
  reviewEditionItem: (...args: unknown[]) => reviewEditionItem(...(args as [])),
  getEditionItem: (...args: unknown[]) => getEditionItem(...(args as [])),
  updateEditionItemPayload: (...args: unknown[]) =>
    updateEditionItemPayload(...(args as [])),
}))

import { GET, PATCH, POST } from '@/app/api/admin/edition/route'

const ITEM_ID = '44444444-4444-4444-8444-444444444444'
const ADMIN_EMAIL = 'editor@euangelion.app'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/admin/edition', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/admin/edition', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

function getRequest() {
  return new Request('http://localhost/api/admin/edition') as never
}

/** What getEditionItem hands back: the store's mapped EditionItem shape. */
function draftPractice() {
  return {
    id: ITEM_ID,
    kind: 'practice',
    publishDate: '2026-08-20',
    slot: 0,
    status: 'draft',
    payload: {
      instruction: 'Read Psalm 131 aloud.',
      reason: 'It is short enough to mean.',
      duration: 'Two minutes',
    },
  }
}

const EDITED_PRACTICE_PAYLOAD = {
  instruction: 'Read Psalm 131 aloud, twice.',
  reason: 'The second reading is the one you hear.',
  duration: 'Three minutes',
}

async function payloadOf(response: Response) {
  return (await response.json()) as { error?: string; ok?: boolean }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  authedUser = null
  authError = null
  getReviewQueue.mockResolvedValue([])
  reviewEditionItem.mockResolvedValue(true)
  getEditionItem.mockResolvedValue(null)
  updateEditionItemPayload.mockResolvedValue(true)
})

describe('/api/admin/edition — the gate', () => {
  it('401s with no session, on both verbs', async () => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)

    expect((await GET(getRequest())).status).toBe(401)
    const post = await POST(postRequest({ id: ITEM_ID, verdict: 'published' }))
    expect(post.status).toBe(401)
    expect(reviewEditionItem).not.toHaveBeenCalled()
    expect(getReviewQueue).not.toHaveBeenCalled()
  })

  it('401s when Supabase itself reports an auth error', async () => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)
    authedUser = { id: 'u-1', email: ADMIN_EMAIL }
    authError = { message: 'jwt expired' }

    expect((await GET(getRequest())).status).toBe(401)
    expect(getReviewQueue).not.toHaveBeenCalled()
  })

  it('403s a signed-in email that is not on the allowlist', async () => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)
    authedUser = { id: 'u-2', email: 'reader@example.com' }

    const response = await POST(
      postRequest({ id: ITEM_ID, verdict: 'published' }),
    )
    expect(response.status).toBe(403)
    expect(reviewEditionItem).not.toHaveBeenCalled()
  })

  it('matches the allowlist case-insensitively and ignores spacing', async () => {
    vi.stubEnv(
      'ADMIN_EMAIL_ALLOWLIST',
      ` someone@else.test , ${ADMIN_EMAIL.toUpperCase()} `,
    )
    authedUser = { id: 'u-3', email: ADMIN_EMAIL }

    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    expect(getReviewQueue).toHaveBeenCalledTimes(1)
  })

  it('FAILS CLOSED when ADMIN_EMAIL_ALLOWLIST is unset — no allowlist, no admins', async () => {
    authedUser = { id: 'u-4', email: ADMIN_EMAIL }

    expect((await GET(getRequest())).status).toBe(403)
    const post = await POST(postRequest({ id: ITEM_ID, verdict: 'published' }))
    expect(post.status).toBe(403)
    expect(reviewEditionItem).not.toHaveBeenCalled()
    expect(getReviewQueue).not.toHaveBeenCalled()
  })

  it('FAILS CLOSED when the allowlist is empty or only separators', async () => {
    authedUser = { id: 'u-5', email: ADMIN_EMAIL }

    for (const value of ['', '   ', ',', ' , , ']) {
      vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', value)
      const response = await POST(
        postRequest({ id: ITEM_ID, verdict: 'published' }),
      )
      expect(response.status).toBe(403)
    }
    expect(reviewEditionItem).not.toHaveBeenCalled()
  })

  it('403s a session with no email at all', async () => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)
    authedUser = { id: 'u-6' }

    const response = await GET(getRequest())
    expect(response.status).toBe(403)
    expect(getReviewQueue).not.toHaveBeenCalled()
  })
})

describe('/api/admin/edition — the verdict', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)
    authedUser = { id: 'admin-1', email: ADMIN_EMAIL }
  })

  it('400s on an id that is not a UUID, before the database sees it', async () => {
    for (const id of [
      'not-a-uuid',
      '44444444-4444-4444-8444',
      "44444444-4444-4444-8444-444444444444' OR 1=1--",
      42,
      null,
    ]) {
      const response = await POST(postRequest({ id, verdict: 'published' }))
      expect(response.status).toBe(400)
    }
    expect(reviewEditionItem).not.toHaveBeenCalled()
  })

  it('400s on a verdict outside published | rejected', async () => {
    for (const verdict of ['approved', 'draft', '', 7, undefined]) {
      const response = await POST(postRequest({ id: ITEM_ID, verdict }))
      expect(response.status).toBe(400)
    }
    expect(reviewEditionItem).not.toHaveBeenCalled()
  })

  it('records a valid verdict against the reviewer', async () => {
    const response = await POST(
      postRequest({ id: ` ${ITEM_ID} `, verdict: 'rejected' }),
    )
    expect(response.status).toBe(200)
    expect(reviewEditionItem).toHaveBeenCalledWith(
      ITEM_ID,
      'rejected',
      'admin-1',
    )
    expect(await payloadOf(response)).toMatchObject({
      ok: true,
      id: ITEM_ID,
      verdict: 'rejected',
    })
  })

  it('409s when the row had already been reviewed — never a silent 200', async () => {
    reviewEditionItem.mockResolvedValue(false)

    const response = await POST(
      postRequest({ id: ITEM_ID, verdict: 'published' }),
    )
    expect(response.status).toBe(409)
    expect((await payloadOf(response)).error).toBe('Already reviewed')
  })

  it('500s with the store’s own message when the write throws', async () => {
    reviewEditionItem.mockRejectedValue(
      new Error('review update failed for 4444: connection refused'),
    )

    const response = await POST(
      postRequest({ id: ITEM_ID, verdict: 'published' }),
    )
    expect(response.status).toBe(500)
    expect((await payloadOf(response)).error).toContain('connection refused')
  })

  it('500s with the store’s own message when the queue read throws', async () => {
    getReviewQueue.mockRejectedValue(
      new Error('review queue read failed: relation does not exist'),
    )

    const response = await GET(getRequest())
    expect(response.status).toBe(500)
    expect((await payloadOf(response)).error).toContain(
      'relation does not exist',
    )
  })
})

describe('/api/admin/edition — the edit (PATCH, SA-114 / F-158)', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', ADMIN_EMAIL)
    authedUser = { id: 'admin-1', email: ADMIN_EMAIL }
  })

  it('401s with no session and 403s an email off the allowlist', async () => {
    authedUser = null
    const unauthed = await PATCH(
      patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(unauthed.status).toBe(401)

    authedUser = { id: 'u-9', email: 'reader@example.com' }
    const forbidden = await PATCH(
      patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(forbidden.status).toBe(403)

    expect(getEditionItem).not.toHaveBeenCalled()
    expect(updateEditionItemPayload).not.toHaveBeenCalled()
  })

  it('400s on an id that is not a UUID, before the database sees it', async () => {
    for (const id of ['not-a-uuid', '44444444-4444-4444-8444', 42, null]) {
      const response = await PATCH(
        patchRequest({ id, payload: EDITED_PRACTICE_PAYLOAD }),
      )
      expect(response.status).toBe(400)
    }
    expect(getEditionItem).not.toHaveBeenCalled()
  })

  it('400s a missing or non-object payload before the row is even read', async () => {
    for (const payload of [undefined, null, 'a string', 7]) {
      const response = await PATCH(patchRequest({ id: ITEM_ID, payload }))
      expect(response.status).toBe(400)
    }
    expect(getEditionItem).not.toHaveBeenCalled()
  })

  it("400s a payload the kind guard refuses, surfacing the guard's own message", async () => {
    getEditionItem.mockResolvedValue(draftPractice())

    const response = await PATCH(
      patchRequest({ id: ITEM_ID, payload: { instruction: 'Only this.' } }),
    )
    expect(response.status).toBe(400)
    expect((await payloadOf(response)).error).toBe(
      'payload failed practice guard',
    )
    expect(updateEditionItemPayload).not.toHaveBeenCalled()
  })

  it('404s an id with no row behind it', async () => {
    const response = await PATCH(
      patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(response.status).toBe(404)
    expect(updateEditionItemPayload).not.toHaveBeenCalled()
  })

  it('409s NOT_A_DRAFT for a row that already has a verdict — published content is edited by the next generation', async () => {
    for (const status of ['published', 'rejected', 'approved']) {
      getEditionItem.mockResolvedValue({ ...draftPractice(), status })
      const response = await PATCH(
        patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
      )
      expect(response.status).toBe(409)
      expect(((await response.json()) as { code?: string }).code).toBe(
        'NOT_A_DRAFT',
      )
    }
    expect(updateEditionItemPayload).not.toHaveBeenCalled()
  })

  it('replaces a draft payload after validation and proves the row moved', async () => {
    getEditionItem.mockResolvedValue(draftPractice())

    const response = await PATCH(
      patchRequest({ id: ` ${ITEM_ID} `, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(response.status).toBe(200)
    expect(updateEditionItemPayload).toHaveBeenCalledWith(
      ITEM_ID,
      EDITED_PRACTICE_PAYLOAD,
    )
    expect(await payloadOf(response)).toMatchObject({ ok: true, id: ITEM_ID })
  })

  it('409s when the row left draft between the read and the write — never a silent 200', async () => {
    getEditionItem.mockResolvedValue(draftPractice())
    updateEditionItemPayload.mockResolvedValue(false)

    const response = await PATCH(
      patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(response.status).toBe(409)
    expect(((await response.json()) as { code?: string }).code).toBe(
      'NOT_A_DRAFT',
    )
  })

  it("500s with the store's own message when the edit write throws", async () => {
    getEditionItem.mockResolvedValue(draftPractice())
    updateEditionItemPayload.mockRejectedValue(
      new Error('edition edit failed for 4444: connection refused'),
    )

    const response = await PATCH(
      patchRequest({ id: ITEM_ID, payload: EDITED_PRACTICE_PAYLOAD }),
    )
    expect(response.status).toBe(500)
    expect((await payloadOf(response)).error).toContain('connection refused')
  })
})
