/**
 * Daily Bread V2 pipeline CLI (SA-142 / F-184).
 *
 *   npm run daily-bread -- build     --date=YYYY-MM-DD [--policy=deterministic-only] [--dry-run]
 *   npm run daily-bread -- publish   --date=YYYY-MM-DD
 *   npm run daily-bread -- run       (the scheduler step; idempotent)
 *   npm run daily-bread -- health
 *   npm run daily-bread -- backfill  --from=YYYY-MM-DD --to=YYYY-MM-DD [--dry-run]
 *   npm run daily-bread -- e2e       (full pipeline in memory, no network, no secrets)
 *   npm run daily-bread -- fixtures  --from=YYYY-MM-DD --days=7 [--assets-dir=.open-next/assets] [--providers]
 *
 * Secrets come from the environment (GitHub secrets in CI, .env.local
 * locally). Values are never printed; every log line is redacted.
 * Exit codes: 0 ok, 1 failure, 2 usage error.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createRunLogger, newRunId, type RunLogger } from '../../src/lib/daily-bread/log'
import { errorMessage } from '../../src/lib/daily-bread/redact'
import {
  createDailyBreadEdition,
  runDailyBread,
  type PipelineDeps,
} from '../../src/lib/daily-bread/orchestrator'
import { publishDailyBreadEdition } from '../../src/lib/daily-bread/publish'
import { defaultEditionSources, type EditionSources } from '../../src/lib/daily-bread/modules/build'
import { getDailyBreadHealth } from '../../src/lib/daily-bread/health'
import { MemoryDailyBreadRepository } from '../../src/lib/daily-bread/repository/memory'
import { SupabaseDailyBreadRepository, type SupabaseLike } from '../../src/lib/daily-bread/repository/supabase'
import type { DailyBreadRepository } from '../../src/lib/daily-bread/repository/types'
import { createClaudeApiProvider } from '../../src/lib/daily-bread/providers/claude-api'
import { createClaudeCliProvider } from '../../src/lib/daily-bread/providers/claude-cli'
import { createGeminiProvider } from '../../src/lib/daily-bread/providers/gemini'
import { createOpenAiProvider } from '../../src/lib/daily-bread/providers/openai'
import type { TextProvider } from '../../src/lib/daily-bread/providers/types'
import {
  addDays,
  editorialDate,
  fixedClock,
  isValidDateSlug,
  rolloverInstant,
  systemClock,
} from '../../src/lib/daily-bread/time'
import { runBackfill } from '../../src/lib/daily-bread/backfill'
import { runInMemoryE2E } from '../../src/lib/daily-bread/e2e'
import { repairLeadPlates } from '../../src/lib/daily-bread/maintenance'
import type { DailyEdition } from '../../src/lib/daily-bread/types'

const ROOT = process.cwd()

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return
  let loaded = 0
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1)
    if (process.env[key] === undefined) {
      process.env[key] = value
      loaded += 1
    }
  }
  console.log(`[daily-bread] loaded ${loaded} key(s) from .env.local`)
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const flag = (name: string) => process.argv.includes(`--${name}`)

function usage(message: string): never {
  console.error(`[daily-bread] ${message}`)
  console.error('usage: npm run daily-bread -- <build|publish|run|health|backfill|e2e|fixtures> [flags]')
  process.exit(2)
}

function requireDate(name: string): string {
  const v = arg(name)
  if (!isValidDateSlug(v)) usage(`--${name}=YYYY-MM-DD is required`)
  return v
}

function supabaseRepo(): DailyBreadRepository {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (use --dry-run for an in-memory build)')
  }
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  return new SupabaseDailyBreadRepository(client as unknown as SupabaseLike)
}

function providers(): TextProvider[] {
  return [createClaudeApiProvider(), createClaudeCliProvider(), createOpenAiProvider(), createGeminiProvider()]
}

function sources(options: { editionItems: boolean }): EditionSources {
  const s = defaultEditionSources()
  if (!options.editionItems) {
    s.liveEditionItems = async () => ({})
    s.generatedLeadArt = async () => null
  }
  return s
}

function deps(repo: DailyBreadRepository, logger: RunLogger, extra: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    repo,
    sources: sources({ editionItems: repo.kind === 'supabase' }),
    providers: providers(),
    clock: systemClock,
    logger,
    trigger: 'manual',
    providerTimeoutMs: Number(process.env.DAILY_BREAD_PROVIDER_TIMEOUT_MS) || 90_000,
    providerRetries: 1,
    ...extra,
  }
}

async function main() {
  loadEnvLocal()
  const command = process.argv[2]
  const logger = createRunLogger(newRunId(`db2-${command ?? 'x'}`))

  switch (command) {
    case 'build': {
      const date = requireDate('date')
      const dryRun = flag('dry-run')
      const repo = dryRun ? new MemoryDailyBreadRepository() : supabaseRepo()
      const policy = arg('policy') === 'deterministic-only' ? 'deterministic-only' : 'full'
      const out = await createDailyBreadEdition(date, deps(repo, logger, { policy }))
      console.log(JSON.stringify({ result: out.result, quality: out.quality, reason: out.reason }, null, 2))
      if (dryRun && out.document) {
        const dir = path.join(ROOT, '.daily-bread-local')
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(out.document, null, 2))
        console.log(`[daily-bread] wrote .daily-bread-local/${date}.json`)
      }
      process.exit(out.result === 'failed' ? 1 : 0)
    }
    case 'publish': {
      const date = requireDate('date')
      const { rejectedEditionItemIds } = await import('../../src/lib/daily-bread/source-review')
      const out = await publishDailyBreadEdition(date, {
        repo: supabaseRepo(),
        clock: systemClock,
        logger,
        trigger: 'manual',
        rejectedSourceItems: rejectedEditionItemIds,
      })
      console.log(JSON.stringify(out, null, 2))
      process.exit(out.result === 'failed' ? 1 : 0)
    }
    case 'run': {
      const { rejectedEditionItemIds } = await import('../../src/lib/daily-bread/source-review')
      const summary = await runDailyBread(
        deps(supabaseRepo(), logger, { trigger: 'scheduler', rejectedSourceItems: rejectedEditionItemIds }),
      )
      console.log(JSON.stringify(summary, null, 2))
      process.exit(summary.ok ? 0 : 1)
    }
    case 'health': {
      const health = await getDailyBreadHealth(supabaseRepo(), systemClock)
      console.log(JSON.stringify(health, null, 2))
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${health.status}\n`)
      }
      process.exit(health.status === 'down' ? 1 : 0)
    }
    case 'backfill': {
      const from = requireDate('from')
      const to = requireDate('to')
      const dryRun = flag('dry-run')
      const repo = dryRun ? new MemoryDailyBreadRepository() : supabaseRepo()
      const result = await runBackfill({
        from,
        to,
        liveDate: editorialDate(systemClock.now()),
        deps: deps(repo, logger, { trigger: 'backfill', policy: 'deterministic-only' }),
      })
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.failed.length > 0 ? 1 : 0)
    }
    case 'repair-lead-plates': {
      const from = requireDate('from')
      const to = requireDate('to')
      const result = await repairLeadPlates({ repo: supabaseRepo(), from, to, dryRun: flag('dry-run') })
      console.log(JSON.stringify(result, null, 2))
      process.exit(result.failed.length > 0 ? 1 : 0)
    }
    case 'e2e': {
      const report = await runInMemoryE2E({ logger })
      console.log(JSON.stringify(report, null, 2))
      process.exit(report.ok ? 0 : 1)
    }
    case 'fixtures': {
      const from = requireDate('from')
      const days = Number(arg('days') ?? '7')
      if (!Number.isInteger(days) || days < 1 || days > 31) usage('--days must be 1-31')
      const repo = new MemoryDailyBreadRepository()
      const useProviders = flag('providers')
      for (let i = 0; i < days; i++) {
        const date = addDays(from, i)
        const clock = fixedClock(new Date(rolloverInstant(date).getTime() - 6 * 3_600_000))
        const d = deps(repo, logger, {
          clock,
          trigger: 'e2e',
          policy: useProviders ? 'full' : 'deterministic-only',
        })
        const built = await createDailyBreadEdition(date, d)
        if (built.result !== 'ready') throw new Error(`fixture build failed for ${date}: ${built.reason}`)
        const pub = await publishDailyBreadEdition(date, d, { ignoreRollover: true })
        console.log(`[daily-bread] fixture ${date}: ${built.quality} · ${pub.result} · No. ${pub.issue}`)
      }
      const editions: DailyEdition[] = []
      for (let i = 0; i < days; i++) {
        const e = await repo.getEdition(addDays(from, i))
        if (e) editions.push(e)
      }
      const payload = JSON.stringify({ generatedAt: new Date().toISOString(), editions })
      const localDir = path.join(ROOT, '.daily-bread-local')
      fs.mkdirSync(localDir, { recursive: true })
      fs.writeFileSync(path.join(localDir, 'fixtures.json'), payload)
      console.log(`[daily-bread] wrote .daily-bread-local/fixtures.json (${editions.length} editions, ${payload.length} bytes)`)
      const assetsDir = arg('assets-dir')
      if (assetsDir) {
        const resolved = path.resolve(ROOT, assetsDir)
        if (!resolved.startsWith(path.join(ROOT, '.open-next'))) usage('--assets-dir must be inside .open-next')
        const target = path.join(resolved, '__daily-bread-fixtures')
        fs.mkdirSync(target, { recursive: true })
        fs.writeFileSync(path.join(target, 'fixtures.json'), payload)
        console.log(`[daily-bread] copied fixtures into ${path.relative(ROOT, target)}`)
      }
      process.exit(0)
    }
    default:
      usage(`unknown command: ${command ?? '(none)'}`)
  }
}

main().catch((error) => {
  console.error('[daily-bread] fatal:', errorMessage(error))
  process.exit(1)
})
