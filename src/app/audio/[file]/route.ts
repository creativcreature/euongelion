import { type NextRequest } from 'next/server'
import { parseRange } from '@/lib/audio/range'

/**
 * Narration audio, served from R2 so that seeking actually seeks.
 *
 * Cloudflare's static-asset layer does not implement 206 Partial Content: a
 * request carrying `Range: bytes=1000000-1000999` comes back 200 with the
 * entire body. Measured 2026-08-19 against a 7.4 MB track, cache hit and all.
 * The `_headers` file advertised `Accept-Ranges: bytes` regardless, so every
 * browser was told seeking was cheap while each scrub refetched the whole
 * reading. R2 reads byte ranges natively, which is the fix.
 *
 * This route only runs because `wrangler.jsonc` lists `/audio/*` under
 * `assets.run_worker_first`. Without that the asset layer answers first and
 * this file is never reached.
 *
 * ORIGIN IS OBSERVABLE, NEVER SILENT. If a key is missing from R2 the response
 * still succeeds from the asset bundle, but carries `x-audio-origin:
 * assets-fallback` so an incomplete upload is visible in one curl rather than
 * hiding behind working audio. A missing object is a deployment problem, not a
 * reader-facing one, and a track that will not play is the worse failure.
 */

export const dynamic = 'force-dynamic'

/**
 * Only the surface this route touches.
 *
 * Declared structurally rather than pulling in `@cloudflare/workers-types`: the
 * package is not a dependency here, and one route needing two methods is not a
 * reason to add a global type surface that would also have to be kept in step
 * with the runtime.
 */
interface R2Object {
  body: ReadableStream
  httpEtag: string
}
interface R2ObjectHead {
  size: number
  httpEtag: string
}
interface AudioBucket {
  head: (key: string) => Promise<R2ObjectHead | null>
  get: (
    key: string,
    options?: { range: { offset: number; length: number } },
  ) => Promise<R2Object | null>
}

interface AudioEnv {
  AUDIO_BUCKET?: AudioBucket
  ASSETS?: { fetch: (request: Request) => Promise<Response> }
}

const IMMUTABLE = 'public,max-age=31536000,immutable'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params
  if (!file.endsWith('.m4a') || file.includes('/') || file.includes('..')) {
    return new Response('Not found', { status: 404 })
  }

  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const { env } = (await getCloudflareContext({ async: true })) as {
    env: AudioEnv
  }

  const bucket = env.AUDIO_BUCKET
  if (bucket) {
    const head = await bucket.head(file)
    if (head) {
      const range = parseRange(request.headers.get('range'), head.size)
      const object = range
        ? await bucket.get(file, {
            range: { offset: range.offset, length: range.length },
          })
        : await bucket.get(file)

      if (object) {
        const headers = new Headers({
          'Content-Type': 'audio/mp4',
          'Cache-Control': IMMUTABLE,
          'Accept-Ranges': 'bytes',
          ETag: object.httpEtag,
          'x-audio-origin': 'r2',
        })
        if (range) {
          headers.set(
            'Content-Range',
            `bytes ${range.offset}-${range.end}/${head.size}`,
          )
          headers.set('Content-Length', String(range.length))
          return new Response(object.body, { status: 206, headers })
        }
        headers.set('Content-Length', String(head.size))
        return new Response(object.body, { status: 200, headers })
      }
    }
  }

  // Labelled fallback — see the note at the top. Never silent.
  if (env.ASSETS) {
    const response = await env.ASSETS.fetch(
      new Request(new URL(`/audio/${file}`, request.url), {
        headers: request.headers,
      }),
    )
    const headers = new Headers(response.headers)
    headers.set('x-audio-origin', 'assets-fallback')
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  }

  return new Response('Audio unavailable', { status: 404 })
}
