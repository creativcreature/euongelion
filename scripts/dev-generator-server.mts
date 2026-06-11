// Local stand-in for the Supabase Edge function `generate-plan-day`.
//
// Same HTTP contract, same shared generation runner — so the full off-request
// architecture (select → status kick → generator → self-chaining days →
// Day-1-first redirect) can be verified end-to-end on this machine before the
// Edge function is deployed. Point the dev server at it with:
//
//   SOUL_AUDIT_GENERATOR_URL=http://localhost:8799 npm run dev
//   npx tsx scripts/dev-generator-server.mts
//
// Contract (mirrors supabase/functions/generate-plan-day):
//   POST /  { ...GenerateDayJob }                  → generate one day, then
//                                                    self-chain the next day
//                                                    in the background.
//   POST /  { mode: 'deepdive', ...DeepDiveJob }   → generate + merge the
//                                                    Deep Dive for one day.
//   Auth: X-Internal-Secret must match INTERNAL_ROUTE_SECRET.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const { runGenerationDay, runDeepDive } = await import(
  '../src/lib/soul-audit/generation-runner.ts'
)

const PORT = Number(process.env.DEV_GENERATOR_PORT || 8799)
const SECRET = process.env.INTERNAL_ROUTE_SECRET || ''

type AnyJob = Record<string, unknown>

async function chainNextDay(
  job: AnyJob,
  nextDay: number,
  chain: { previousDaysSummary: string; usedChunkIds: string[] },
) {
  // Mirror the Edge function's self-chain: same payload, next day, carrying
  // the runner's continuity payload (accumulated summaries + used chunk ids).
  const next = {
    ...job,
    dayNumber: nextDay,
    previousDaysSummary: chain.previousDaysSummary,
    usedChunkIds: chain.usedChunkIds,
  }
  const res = await fetch(`http://localhost:${PORT}/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Internal-Secret': SECRET,
    },
    body: JSON.stringify(next),
  })
  if (!res.ok) {
    console.error(
      `[dev-generator] chain to day ${nextDay} failed: ${res.status}`,
    )
  }
}

const server = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end()
    return
  }
  if (req.headers['x-internal-secret'] !== SECRET || !SECRET) {
    res.writeHead(403, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Forbidden' }))
    return
  }

  let raw = ''
  req.on('data', (chunk) => (raw += chunk))
  req.on('end', () => {
    void (async () => {
      let body: AnyJob
      try {
        body = JSON.parse(raw) as AnyJob
      } catch {
        res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }

      try {
        if (body.mode === 'deepdive') {
          console.log(
            `[dev-generator] deep dive: plan=${body.planId} day=${body.dayNumber}`,
          )
          const result = await runDeepDive({
            planId: String(body.planId),
            dayNumber: Number(body.dayNumber),
            theme: String(body.theme ?? ''),
            scriptureAnchor: String(body.scriptureAnchor ?? ''),
            userInput: String(body.userInput ?? ''),
          })
          res.writeHead(result.ok ? 200 : result.status, {
            'content-type': 'application/json',
          })
          res.end(JSON.stringify(result))
          return
        }

        console.log(
          `[dev-generator] day ${body.dayNumber}: plan=${body.planId} job=${body.jobId}`,
        )
        const result = await runGenerationDay({
          jobId: String(body.jobId),
          planId: String(body.planId),
          runId: String(body.runId),
          dayNumber: Number(body.dayNumber),
          totalContentDays: Number(body.totalContentDays ?? 5),
          theme: String(body.theme ?? ''),
          scriptureAnchor: String(body.scriptureAnchor ?? ''),
          userInput: String(body.userInput ?? ''),
          previousDaysSummary: String(body.previousDaysSummary ?? ''),
          usedChunkIds: Array.isArray(body.usedChunkIds)
            ? (body.usedChunkIds as string[])
            : [],
          sessionId: body.sessionId ? String(body.sessionId) : undefined,
        })

        res.writeHead(result.ok ? 200 : result.status, {
          'content-type': 'application/json',
        })
        res.end(JSON.stringify(result))

        // Self-chain the next day AFTER responding (the Edge function does
        // this with EdgeRuntime.waitUntil). Day-1-first depends on this: the
        // browser navigates after day 1; the chain finishes the edition.
        if (result.ok && !result.complete && result.nextDay && result.chain) {
          const { nextDay, chain } = result
          setTimeout(() => void chainNextDay(body, nextDay, chain), 50)
        }
      } catch (error) {
        console.error('[dev-generator] fatal:', error)
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'internal error' }))
        }
      }
    })()
  })
})

server.listen(PORT, () => {
  console.log(
    `[dev-generator] listening on http://localhost:${PORT} (Edge-function stand-in; secret ${SECRET ? 'loaded' : 'MISSING'})`,
  )
})
