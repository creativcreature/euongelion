/**
 * The 7am publication, driven by a Cloudflare Cron Trigger on the site's own
 * Worker (plan §18–19, SA-142 / F-184).
 *
 * GitHub Actions still BUILDS the next edition (that needs the Claude CLI and
 * minutes of work, outside the Workers request budget). But GitHub's schedule
 * is best-effort: on 2026-09-14 the 11:05 UTC publish run had not fired 39
 * minutes after rollover and an evening build ran 5.5 hours late. Publishing a
 * READY edition is one database transaction, so the Worker does it on the
 * minute, through the existing internal publish route (X-Internal-Secret,
 * idempotent, refuses future dates). Worker entry: worker-entry.mjs.
 *
 * Pure apart from the injected fetch: no Next, no Supabase import, so the
 * Worker entry can bundle it directly.
 */
import { editorialDate } from './time'

/**
 * The Worker's Daily Bread cron (UTC). 07:00 New York is 11:00 UTC in EDT and
 * 12:00 UTC in EST; four tries in each of those hours cover both, and every
 * try after the first is a harmless already_published. Must match
 * wrangler.jsonc triggers.crons.
 */
export const DAILY_BREAD_PUBLISH_CRON = '1,15,30,45 11,12 * * *'

export interface ScheduledPublishResult {
  date: string
  status: number
  result: string
  issue?: number | null
}

export async function publishDueEdition(params: {
  now: Date
  appUrl: string
  secret: string | undefined
  fetch: (request: Request) => Promise<Response>
  log?: (line: string) => void
}): Promise<ScheduledPublishResult> {
  const log = params.log ?? ((line: string) => console.log(line))
  const date = editorialDate(params.now)
  const record = (outcome: ScheduledPublishResult) => {
    log(JSON.stringify({ scope: 'daily-bread', event: 'cron_publish', ts: params.now.toISOString(), ...outcome }))
    return outcome
  }
  if (!params.secret) return record({ date, status: 0, result: 'no-internal-secret' })

  const origin = params.appUrl.replace(/\/+$/, '')
  let response: Response
  try {
    response = await params.fetch(
      new Request(`${origin}/api/admin/daily-bread/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': params.secret },
        body: JSON.stringify({ date }),
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.name : 'error'
    return record({ date, status: 0, result: `fetch-failed:${message}` })
  }
  let body: { result?: unknown; issue?: unknown; code?: unknown } = {}
  try {
    body = (await response.json()) as typeof body
  } catch {
    // A non-JSON body is reported by status alone.
  }
  const result = typeof body.result === 'string' ? body.result : typeof body.code === 'string' ? body.code : 'unknown'
  const issue = typeof body.issue === 'number' ? body.issue : null
  return record({ date, status: response.status, result, issue })
}
