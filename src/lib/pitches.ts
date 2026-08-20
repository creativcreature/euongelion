/**
 * The pitch archive's read side (SA-114 / F-158).
 *
 * CONCURRENT-SAFE BY DESIGN: sessions publish one Storage object per pitch
 * and there is no shared index file — this module derives the index by
 * LISTING the private bucket, so simultaneous writers can never clobber
 * each other's entries. Ordering comes from each pitch's own updatedAt.
 */

export interface PitchMeta {
  slug: string
  title: string
  tags: string[]
  session: string
  createdAt: string
  updatedAt: string
}

export interface PitchDoc extends PitchMeta {
  html: string
}

export interface PitchResponse {
  at: string
  verdict: string
  comment: string
}

function env() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) throw new Error('pitch storage env missing')
  return { base, key, H: { apikey: key, Authorization: `Bearer ${key}` } }
}

export async function readPitch(slug: string): Promise<PitchDoc | null> {
  const { base, H } = env()
  const r = await fetch(
    `${base}/storage/v1/object/pitches/items/${slug}.json`,
    {
      headers: H,
      cache: 'no-store',
    },
  )
  return r.ok ? ((await r.json()) as PitchDoc) : null
}

export async function readResponses(slug: string): Promise<PitchResponse[]> {
  const { base, H } = env()
  const r = await fetch(
    `${base}/storage/v1/object/pitches/responses/${slug}.json`,
    { headers: H, cache: 'no-store' },
  )
  return r.ok ? ((await r.json()) as PitchResponse[]) : []
}

export async function writeResponses(
  slug: string,
  responses: PitchResponse[],
): Promise<void> {
  const { base, H } = env()
  const r = await fetch(
    `${base}/storage/v1/object/pitches/responses/${slug}.json`,
    {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' },
      body: JSON.stringify(responses),
    },
  )
  if (!r.ok) throw new Error(`pitch response write failed: ${r.status}`)
}

/** Every pitch, newest-updated first, with its response summary. */
export async function listPitches(): Promise<
  (PitchMeta & { responseCount: number; latestVerdict: string | null })[]
> {
  const { base, H } = env()
  const r = await fetch(`${base}/storage/v1/object/list/pitches`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prefix: 'items/',
      limit: 1000,
      sortBy: { column: 'updated_at', order: 'desc' },
    }),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`pitch list failed: ${r.status}`)
  const objects = (await r.json()) as { name: string }[]
  const slugs = objects
    .map((o) => o.name.replace(/\.json$/, ''))
    .filter((n) => /^[a-z0-9-]{1,64}$/.test(n))
  const pitches = await Promise.all(
    slugs.map(async (slug) => {
      const doc = await readPitch(slug)
      if (!doc) return null
      const responses = await readResponses(slug)
      const verdicts = responses.filter((x) => x.verdict !== 'comment')
      return {
        slug: doc.slug,
        title: doc.title,
        tags: doc.tags,
        session: doc.session,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        responseCount: responses.length,
        latestVerdict: verdicts.at(-1)?.verdict ?? null,
      }
    }),
  )
  return pitches
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}
