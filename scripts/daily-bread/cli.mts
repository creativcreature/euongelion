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
 *   npm run daily-bread -- sunday-lead --days=N [--from=YYYY-MM-DD] [--dry-run]
 *   npm run daily-bread -- guides      --days=N [--from=YYYY-MM-DD] [--force] [--dry-run]
 *
 * sunday-lead and guides are the pre-V2 Claude workflows (SA-100, SA-114),
 * now behind the editorial generation interface. They write DRAFT
 * edition_items rows for the founder's queue; --dry-run writes nothing and
 * saves the result under .daily-bread-local/.
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
import { repairComics, repairLeadPlates } from '../../src/lib/daily-bread/maintenance'
import type { DailyEdition, ProviderUsage } from '../../src/lib/daily-bread/types'
import { createEditorialGenerator } from '../../src/lib/daily-bread/generate/editorial'
import { composeSundayLead, sundayLeadPayload, sundayLeadWordCount } from '../../src/lib/daily-bread/generate/sunday-lead'
import { composeGuides } from '../../src/lib/daily-bread/generate/guides'

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
  console.error('usage: npm run daily-bread -- <build|publish|run|health|backfill|e2e|fixtures|sunday-lead|guides> [flags]')
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

/**
 * The draft writers put Claude Code first: it is the subscription transport
 * the SA-100/SA-114 workflows used, and the only one that can search the repo.
 */
function draftProviders(): TextProvider[] {
  return [createClaudeCliProvider(), createClaudeApiProvider(), createOpenAiProvider(), createGeminiProvider()]
}

function usageLine(usage: ProviderUsage[]): string {
  return usage.map((u) => `${u.provider}${u.ok ? ' ok' : `: ${u.error ?? 'failed'}`}`).join(' → ')
}

/** Dates in the window, starting --from (default: tomorrow, UTC). */
function draftWindow(): string[] {
  const days = Number(arg('days') ?? '1')
  if (!Number.isInteger(days) || days < 1 || days > 31) usage('--days must be 1-31')
  const from = arg('from')
  if (from !== undefined && !isValidDateSlug(from)) usage('--from must be YYYY-MM-DD')
  const start = from ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  return Array.from({ length: days }, (_, i) => addDays(start, i))
}

function supabaseRest(): { url: (p: string) => string; headers: Record<string, string> } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or use --dry-run)')
  return { url: (p) => `${url}${p}`, headers: { apikey: key, Authorization: `Bearer ${key}` } }
}

async function upsertDraftRows(rows: object[]): Promise<void> {
  const sb = supabaseRest()
  const res = await fetch(sb.url('/rest/v1/edition_items?on_conflict=kind,publish_date,slot'), {
    method: 'POST',
    headers: { ...sb.headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`draft upsert failed ${res.status}: ${errorMessage(await res.text(), 300)}`)
}

function saveLocal(name: string, value: unknown): void {
  const dir = path.join(ROOT, '.daily-bread-local')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2))
  console.log(`[daily-bread] wrote .daily-bread-local/${name}`)
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
    case 'repair-comics': {
      const from = requireDate('from')
      const to = requireDate('to')
      const result = await repairComics({
        repo: supabaseRepo(),
        sources: defaultEditionSources(),
        from,
        to,
        dryRun: flag('dry-run'),
      })
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
    case 'reservoir': {
      // Plan §53. Local sources always; --usage also reads the published paper
      // and the approved strips from the database.
      const { buildReservoir } = await import('../../src/lib/daily-bread/assets/reservoir')
      const { SERIES_DATA } = await import('../../src/data/series')
      const { PROCEDURAL_SCENES } = await import('../../src/lib/daily-bread/generate/frame')
      const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/print-audit-2026-08-18.json'), 'utf8')) as {
        prints: { file: string; artist: string; verdict: string }[]
      }
      const vasariRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/gallery-vasari.json'), 'utf8')) as {
        entries: { file: string; title: string }[]
      }
      const prints = audit.prints.filter((p) => p.verdict === 'clean')
      const series = Object.entries(SERIES_DATA).map(([slug, s]) => ({ slug, ...s }))
      const sharp = (await import('sharp')).default
      const dimensions = new Map<string, { width: number; height: number }>()
      const unmeasured: string[] = []
      for (const src of [...prints.map((p) => `/images/devotional-prints/${p.file}`), ...series.flatMap((s) => (s.heroImage ? [s.heroImage] : []))]) {
        try {
          const meta = await sharp(path.join(ROOT, 'public', src)).metadata()
          if (meta.width && meta.height) dimensions.set(src, { width: meta.width, height: meta.height })
          else unmeasured.push(src)
        } catch {
          unmeasured.push(src)
        }
      }
      let strips: { panelId: string; image: string; caption: string; width: number; height: number }[] = []
      let editions: DailyEdition[] | undefined
      if (flag('usage')) {
        strips = await defaultEditionSources().publishedStrips()
        const repo = supabaseRepo()
        const entries = await repo.listArchive({ limit: 500 })
        editions = []
        for (const entry of entries) {
          const e = await repo.getEdition(entry.editionDate)
          if (e) editions.push(e)
        }
      }
      const assets = buildReservoir({
        prints,
        vasari: new Map(vasariRaw.entries.map((e) => [e.file, { title: e.title }])),
        series,
        scenes: PROCEDURAL_SCENES,
        strips,
        dimensions,
        editions,
      })
      const out = {
        generatedAt: new Date().toISOString(),
        usageFrom: editions ? `${editions.length} published editions` : 'not read (run with --usage)',
        counts: Object.fromEntries(
          ['historical-art', 'euangelion-art', 'procedural-poster', 'comic'].map((k) => [k, assets.filter((a) => a.kind === k).length]),
        ),
        assets,
      }
      fs.writeFileSync(path.join(ROOT, 'docs/daily-bread/asset-reservoir.json'), `${JSON.stringify(out, null, 2)}\n`)
      console.log(`[reservoir] ${assets.length} assets ${JSON.stringify(out.counts)}; usage: ${out.usageFrom}`)
      if (unmeasured.length > 0) console.warn(`[reservoir] ${unmeasured.length} file(s) could not be measured: ${unmeasured.slice(0, 5).join(', ')}`)
      process.exit(0)
    }
    case 'sunday-lead': {
      const dryRun = flag('dry-run')
      const sundays = draftWindow().filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 0)
      if (sundays.length === 0) {
        console.log('[sunday-lead] no Sunday in the window — nothing to compose')
        process.exit(0)
      }
      const { SUNDAY_BRIEFS, isoWeekUTC } = await import('../../src/lib/edition/generators/lead')
      const { getVerse } = await import('../../src/lib/bible/getVerse')
      const generator = createEditorialGenerator({ providers: draftProviders(), logger, retries: 1 })
      for (const date of sundays) {
        const brief = SUNDAY_BRIEFS[(isoWeekUTC(new Date(`${date}T00:00:00Z`)) - 1) % SUNDAY_BRIEFS.length]
        const verse = await getVerse(brief.scriptureReference, 'BSB')
        const scripture = { canonical: verse.canonical, text: verse.text }
        console.log(`[sunday-lead] composing ${date}: ${brief.theme}`)
        const out = await composeSundayLead({ generator, brief, scripture, repoDir: ROOT })
        const payload = sundayLeadPayload(brief, scripture, out.value)
        const words = sundayLeadWordCount(out.value.body)
        console.log(`[sunday-lead] ${date}: ${words} words via ${out.provider} (${usageLine(out.usage)})`)
        if (dryRun) {
          saveLocal(`sunday-lead-${date}.json`, { date, provider: out.provider, model: out.model, usage: out.usage, payload })
          continue
        }
        await upsertDraftRows([{ kind: 'lead', publish_date: date, slot: 0, status: 'draft', payload }])
        console.log(`[sunday-lead] ${date} draft inserted`)
      }
      process.exit(0)
    }
    case 'guides': {
      const dryRun = flag('dry-run')
      const dates = draftWindow()
      // The bank's plates, reused in rotation — no image generation here (SA-114).
      const PLATES = [
        { image: '/images/edition/guide-whole-book.webp', alt: 'A hand holding an open scroll' },
        { image: '/images/edition/guide-who-speaks.webp', alt: 'Two travellers on a road, joined by a stranger' },
        { image: '/images/edition/guide-scripture-interprets.webp', alt: 'Two stone tablets' },
      ]
      const sb = supabaseRest()
      let log: { date: string; title: string; kicker: string }[] = []
      const logRes = await fetch(sb.url('/storage/v1/object/edition-assets/pipeline/guides-log.json'), { headers: sb.headers })
      if (logRes.ok) log = (await logRes.json()) as typeof log
      const generator = createEditorialGenerator({ providers: draftProviders(), logger, retries: 1 })
      for (const date of dates) {
        const existing = (await fetch(sb.url(`/rest/v1/edition_items?kind=eq.guide&publish_date=eq.${date}&select=id`), {
          headers: sb.headers,
        }).then((r) => r.json())) as unknown[]
        if (existing.length > 0 && !flag('force')) {
          console.log(`[guides] ${date} already has ${existing.length} — skipping`)
          continue
        }
        const out = await composeGuides({ generator, date, coveredTitles: log.map((e) => e.title) })
        const rows = out.value.map((g, i) => ({
          kind: 'guide',
          publish_date: date,
          slot: i,
          status: 'draft',
          payload: { ...g, ...PLATES[i % PLATES.length] },
        }))
        console.log(`[guides] ${date}: ${out.value.map((g) => g.title).join(' · ')} via ${out.provider} (${usageLine(out.usage)})`)
        if (dryRun) {
          saveLocal(`guides-${date}.json`, { date, provider: out.provider, model: out.model, usage: out.usage, rows })
          continue
        }
        await upsertDraftRows(rows)
        log.push(...out.value.map((g) => ({ date, title: g.title, kicker: g.kicker })))
        const lg = await fetch(sb.url('/storage/v1/object/edition-assets/pipeline/guides-log.json'), {
          method: 'POST',
          headers: { ...sb.headers, 'Content-Type': 'application/json', 'x-upsert': 'true' },
          body: JSON.stringify(log, null, 2),
        })
        if (!lg.ok) throw new Error(`[guides] log write failed: ${lg.status}`)
        console.log(`[guides] ${date}: 3 drafts inserted`)
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
