// Supabase Edge Function: generate-plan-day
//
// The off-request executor for Soul Audit plan generation (SA-020, F-026).
// Cloudflare Workers' free plan kills fire-and-forget work at ~30s, which a
// ~40s Sonnet grounded reading cannot fit — so the app's /status kick POSTs
// here instead (SOUL_AUDIT_GENERATOR_URL). This function:
//
//   1. generates ONE day via the SHARED generation runner (the exact same
//      src/lib/soul-audit/generation-runner.ts the Next route and the local
//      dev shim run — single source of truth, no behavioral drift),
//   2. responds as soon as that day is saved (Day-1-first: the loader
//      redirects the reader into Day 1 while the rest keeps setting),
//   3. self-chains the next day in the background via EdgeRuntime.waitUntil
//      until the edition completes (recap + sabbath included).
//
// Contract:
//   POST { ...GenerateDayJob }                → one day + background chain
//   POST { mode: 'deepdive', ...DeepDiveJob } → merge the Deep Dive into a day
//   Auth: X-Internal-Secret must equal the INTERNAL_ROUTE_SECRET secret.
//
// Deploy (see docs/SOUL-AUDIT-GROUNDED-REBUILD-PLAN.md for the full runbook):
//   supabase functions deploy generate-plan-day --no-verify-jwt
//   supabase secrets set INTERNAL_ROUTE_SECRET=... ANTHROPIC_API_KEY=... \
//     NEXT_PUBLIC_APP_URL=https://euangelion.app
//
// deno.json maps the app's import aliases into this runtime:
//   @/                     → ../../../src/   (the real app source — shared)
//   @/lib/brain/router     → ./brain-direct.ts (direct Anthropic; no router tree)
//   @opennextjs/cloudflare → ./opennext-stub.ts (loaders fall through to self-fetch)

declare const Deno: {
  env: { get(name: string): string | undefined; toObject(): Record<string, string> }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}
declare const EdgeRuntime:
  | { waitUntil(promise: Promise<unknown>): void }
  | undefined

// ── process.env shim BEFORE any app-source import ─────────────────────
// The shared runner tree reads process.env at call time (ANTHROPIC_API_KEY,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL,
// SOUL_AUDIT_MODEL). Supabase's edge runtime already exposes a Node-compat
// `process.env`, but it may be a read-only proxy — so map defensively and
// never let env wiring crash module load.
try {
  const denoEnv = Deno.env.toObject()
  const g = globalThis as {
    process?: { env?: Record<string, string> }
  }
  if (!g.process) g.process = { env: { ...denoEnv } }
  else if (!g.process.env) g.process.env = { ...denoEnv }
  const pe = g.process.env
  const ensure = (k: string, v: string | undefined) => {
    try {
      if (v !== undefined && (pe[k] === undefined || pe[k] === '')) pe[k] = v
    } catch {
      /* read-only env entry — Supabase already provides it */
    }
  }
  for (const [k, v] of Object.entries(denoEnv)) ensure(k, v)
  ensure(
    'NEXT_PUBLIC_SUPABASE_URL',
    pe.NEXT_PUBLIC_SUPABASE_URL || pe.SUPABASE_URL || denoEnv.SUPABASE_URL,
  )
} catch (err) {
  console.error('[generate-plan-day] env shim warning:', err)
}

type AnyJob = Record<string, unknown>

function selfUrl(): string {
  const base = Deno.env.get('SUPABASE_URL') ?? ''
  return `${base}/functions/v1/generate-plan-day`
}

function selfHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'X-Internal-Secret': Deno.env.get('INTERNAL_ROUTE_SECRET') ?? '',
    Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`,
  }
}

async function chainNextDay(
  job: AnyJob,
  nextDay: number,
  chain: { previousDaysSummary: string; usedChunkIds: string[] },
): Promise<void> {
  const res = await fetch(selfUrl(), {
    method: 'POST',
    headers: selfHeaders(),
    body: JSON.stringify({
      ...job,
      dayNumber: nextDay,
      previousDaysSummary: chain.previousDaysSummary,
      usedChunkIds: chain.usedChunkIds,
    }),
  })
  if (!res.ok) {
    console.error(
      `[generate-plan-day] chain to day ${nextDay} failed: ${res.status}`,
    )
    // The /status stall detector + re-kick (reconstructGenerationState)
    // resumes from the last saved day on the reader's next poll/visit.
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }
  const secret = Deno.env.get('INTERNAL_ROUTE_SECRET') ?? ''
  if (!secret || req.headers.get('X-Internal-Secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: AnyJob
  try {
    body = (await req.json()) as AnyJob
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Import AFTER the process.env shim ran (top of module) — dynamic so the
  // shared tree never reads a half-initialized environment.
  const { runGenerationDay, runDeepDive } = await import(
    '@/lib/soul-audit/generation-runner'
  )

  if (body.mode === 'deepdive') {
    const result = await runDeepDive({
      planId: String(body.planId ?? ''),
      dayNumber: Number(body.dayNumber ?? 0),
      theme: String(body.theme ?? ''),
      scriptureAnchor: String(body.scriptureAnchor ?? ''),
      userInput: String(body.userInput ?? ''),
    })
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : result.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  const result = await runGenerationDay({
    jobId: String(body.jobId ?? ''),
    planId: String(body.planId ?? ''),
    runId: String(body.runId ?? ''),
    dayNumber: Number(body.dayNumber ?? 0),
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

  // Self-chain the rest of the edition AFTER this response is sent.
  if (result.ok && !result.complete && result.nextDay && result.chain) {
    const continuation = chainNextDay(body, result.nextDay, result.chain)
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(continuation)
    } else {
      void continuation
    }
  }

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : result.status,
    headers: { 'content-type': 'application/json' },
  })
})
