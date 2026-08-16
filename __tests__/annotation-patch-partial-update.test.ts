/**
 * SA-059 — a style-only PATCH must not eat the anchor text.
 *
 * The bug this pins, found 2026-08-16 while designing the journaling work:
 *
 *   `updateAnnotation` overwrote `anchor_text` and `body` with whatever the
 *   PATCH carried. `persistEdit` in TextHighlightTrigger sends ONLY
 *   `annotationId` + `style`, and `sanitizeOptionalText(undefined, n)` returns
 *   null. So recolouring a highlight — or saving a note on one — nulled the
 *   text it was anchored to.
 *
 * The damage was invisible until the next load: `hydrateSavedHighlights`
 * matches a stored row back onto the page by `anchor_text || body`, finds
 * nothing to match, and the mark never repaints. The reader's highlight was
 * gone, the Library row rendered blank, and nothing anywhere reported a
 * failure. Silent data loss on the most-used control in the reader.
 *
 * NOTE ON SCOPE: these run against the in-memory store. Vitest does not load
 * .env.local, so `maybeSupabase()` returns null and no Supabase call is made.
 * That keeps the suite off production — but it also means a green run here is
 * NOT evidence that the column survived a real round trip. Verify that in
 * `npm run preview` against a real row.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  addAnnotation,
  listAnnotations,
  updateAnnotation,
} from '@/lib/soul-audit/repository'

const ANCHOR = 'the promise was not made to the strong'

/** Unique per test: the runtime store is a module global and outlives a file. */
let session = ''
let counter = 0

beforeEach(async () => {
  counter += 1
  session = `user-partial-update-${counter}`
  await addAnnotation({
    sessionToken: session,
    devotionalSlug: 'looking-at-the-sun-day-1',
    annotationType: 'highlight',
    anchorText: ANCHOR,
    body: ANCHOR,
    style: {
      source: 'text-selection',
      kind: 'favorite_verse',
      color: 'yellow',
    },
  })
})

describe('updateAnnotation is a partial update', () => {
  it('preserves anchor_text and body when only style is sent', async () => {
    const [row] = listAnnotations(session)

    // Exactly what recolouring a highlight sends.
    await updateAnnotation({
      sessionToken: session,
      annotationId: row.id,
      style: {
        source: 'text-selection',
        kind: 'favorite_verse',
        color: 'blue',
      },
    })

    const [after] = listAnnotations(session)
    expect(after.anchor_text).toBe(ANCHOR)
    expect(after.body).toBe(ANCHOR)
    expect(after.style?.color).toBe('blue')
  })

  it('preserves the anchor when a note is attached to a highlight', async () => {
    const [row] = listAnnotations(session)

    await updateAnnotation({
      sessionToken: session,
      annotationId: row.id,
      style: {
        source: 'text-selection',
        kind: 'favorite_verse',
        color: 'yellow',
        note: 'Jabez asked for more and was not rebuked for it.',
      },
    })

    const [after] = listAnnotations(session)
    expect(after.anchor_text).toBe(ANCHOR)
    expect(after.style?.note).toBe(
      'Jabez asked for more and was not rebuked for it.',
    )
  })

  it('clears a column only when null is passed explicitly', async () => {
    const [row] = listAnnotations(session)

    await updateAnnotation({
      sessionToken: session,
      annotationId: row.id,
      body: null,
    })

    const [after] = listAnnotations(session)
    expect(after.body).toBeNull()
    // Absent from the call, so untouched — the whole point of the fix.
    expect(after.anchor_text).toBe(ANCHOR)
  })

  it('still writes a value when one is supplied', async () => {
    const [row] = listAnnotations(session)

    await updateAnnotation({
      sessionToken: session,
      annotationId: row.id,
      body: 'edited body',
    })

    const [after] = listAnnotations(session)
    expect(after.body).toBe('edited body')
    expect(after.anchor_text).toBe(ANCHOR)
  })

  it('returns the row unchanged when no field is sent at all', async () => {
    const [row] = listAnnotations(session)

    const result = await updateAnnotation({
      sessionToken: session,
      annotationId: row.id,
    })

    expect(result?.anchor_text).toBe(ANCHOR)
    expect(result?.body).toBe(ANCHOR)
    expect(result?.style?.color).toBe('yellow')
  })

  it('returns null for an annotation the session does not own', async () => {
    const [row] = listAnnotations(session)

    const result = await updateAnnotation({
      sessionToken: 'someone-else',
      annotationId: row.id,
      style: { color: 'pink' },
    })

    expect(result).toBeNull()
  })
})
