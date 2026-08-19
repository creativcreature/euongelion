#!/usr/bin/env tsx
/**
 * The Daily Bread — edition build runner, the part that does the work
 * (SA-090 / F-136). Launched by `scripts/edition/build.mjs`; never run Node on
 * this file directly, it is TypeScript.
 *
 * One run = one window of editions. For every UTC date in the window it calls
 * every generator once, promotes the deterministic sections to `published`, and
 * writes the batch through `upsertEditionItems`. The command the founder runs by
 * hand (`--days=30`) is the command the nightly Action runs unattended
 * (`--days=1`), which is the whole point: there is no second code path that only
 * ever executes at 03:00 UTC and is therefore never really tested.
 *
 * FAILURE BEHAVIOUR (Development Rule 1 — no silent fallbacks):
 *   - a generator that throws ABORTS the run, non-zero. We never skip a section
 *     and carry on, because a paper that is quietly missing its puzzles page
 *     looks the same as a paper that never had one;
 *   - missing Supabase credentials ABORT before any generator runs, rather than
 *     letting supabase-js build a client around `undefined` and fail later with
 *     a confusing network error;
 *   - `upsertEditionItems` validates every item against the payload guards and
 *     rejects the WHOLE batch on the first bad one. A half-written edition is
 *     worse than a loudly-failed one. `--dry-run` runs those same guards itself,
 *     so a preview can never pass something the real write would reject;
 *   - `--kinds` naming a kind that has no generator ABORTS. Building nine of the
 *     ten sections you asked for and exiting 0 is a silent fallback.
 *
 * DETERMINISM: nothing here reads the clock except the default value of
 * `--from`, which is resolved once, up front, and printed. Every generator is
 * handed a UTC date and must key its output off that date alone.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  DETERMINISTIC_KINDS,
  EDITION_KINDS,
  validateEditionItem,
  type EditionItem,
  type EditionKind,
} from '../../src/lib/edition/kinds'

/* ── Argv ─────────────────────────────────────────────────────────────── */

export interface EditionBuildArgs {
  /** How many consecutive editions to build. Always >= 1. */
  days: number
  /** First edition date, 'YYYY-MM-DD' UTC. */
  from: string
  /** Restrict the run to these kinds, or null for every kind with a generator. */
  kinds: EditionKind[] | null
  /** Print the items and write nothing. */
  dryRun: boolean
}

const USAGE =
  'usage: node scripts/edition/build.mjs [--days=N] [--from=YYYY-MM-DD|today|tomorrow] [--kinds=a,b] [--dry-run]'

/** 'YYYY-MM-DD' that is also a real calendar date — 2026-02-30 is neither. */
function assertIsoDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${value}`)
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a real calendar date: ${value}`)
  }
  return value
}

function utcDayString(date: Date, offsetDays = 0): string {
  const shifted = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offsetDays),
  )
  return shifted.toISOString().slice(0, 10)
}

/**
 * Parse the runner's flags. Only the `--flag=value` form is accepted; a bare
 * `--days 3` is rejected rather than silently parsed as `--days` plus a stray
 * positional, which is how "it ran but built nothing" happens.
 *
 * `now` is injectable purely so the default-`--from` behaviour is testable
 * without freezing the system clock; callers pass nothing.
 */
export function parseArgs(argv: string[], now: Date = new Date()): EditionBuildArgs {
  let days = 1
  let from: string | null = null
  let kinds: EditionKind[] | null = null
  let dryRun = false

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (!arg.startsWith('--')) {
      throw new Error(`unexpected argument: ${arg}\n${USAGE}`)
    }

    const eq = arg.indexOf('=')
    if (eq === -1) {
      throw new Error(`${arg} needs a value, e.g. ${arg}=...\n${USAGE}`)
    }
    const flag = arg.slice(0, eq)
    const value = arg.slice(eq + 1)

    switch (flag) {
      case '--days': {
        if (!/^\d+$/.test(value)) throw new Error(`--days must be a whole number, got: ${value}`)
        days = Number(value)
        if (days < 1) throw new Error(`--days must be at least 1, got: ${value}`)
        break
      }
      case '--from': {
        if (value === 'today') from = utcDayString(now, 0)
        else if (value === 'tomorrow') from = utcDayString(now, 1)
        else from = assertIsoDate(value, '--from')
        break
      }
      case '--kinds': {
        const requested = value
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter((k) => k.length > 0)
        if (requested.length === 0) throw new Error(`--kinds needs at least one kind\n${USAGE}`)
        for (const kind of requested) {
          if (!(EDITION_KINDS as readonly string[]).includes(kind)) {
            throw new Error(
              `--kinds: unknown kind "${kind}". Known kinds: ${EDITION_KINDS.join(', ')}`,
            )
          }
        }
        kinds = requested as EditionKind[]
        break
      }
      case '--dry-run':
        throw new Error(`--dry-run takes no value\n${USAGE}`)
      default:
        throw new Error(`unknown flag: ${flag}\n${USAGE}`)
    }
  }

  return { days, from: from ?? utcDayString(now, 1), kinds, dryRun }
}

/**
 * Every UTC date in the window, inclusive of `from`. Month and year rollovers
 * are handled by `Date.UTC` overflow, not by string arithmetic.
 */
export function datesInWindow(from: string, days: number): string[] {
  assertIsoDate(from, 'from')
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`days must be a whole number >= 1, got: ${days}`)
  }
  const start = new Date(`${from}T00:00:00Z`)
  const out: string[] = []
  for (let i = 0; i < days; i += 1) {
    out.push(utcDayString(start, i))
  }
  return out
}

/* ── Environment ──────────────────────────────────────────────────────── */

/**
 * Load `.env.local` into `process.env` for keys that are not already set, so
 * the same command works locally and in the Action (where the secrets arrive as
 * real env vars and must win). No dotenv dependency — this is twenty lines and
 * the file format we control.
 */
function loadEnvLocal(repoRoot: string): void {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) {
    console.log(`[edition] no .env.local at ${envPath} — using the process environment`)
    return
  }
  const text = fs.readFileSync(envPath, 'utf8')
  let loaded = 0
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
      loaded += 1
    }
  }
  console.log(`[edition] loaded ${loaded} key(s) from .env.local`)
}

function assertSupabaseEnv(): void {
  const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
    (key) => !process.env[key],
  )
  if (missing.length > 0) {
    throw new Error(
      `missing required environment: ${missing.join(', ')}. ` +
        `Set them in .env.local locally, or as repository secrets for the daily-edition Action.`,
    )
  }
}

/* ── The run ──────────────────────────────────────────────────────────── */

type GeneratorFn = (date: Date) => Promise<EditionItem[]>

/**
 * Every generator the runner knows about, in the paper's reading order: front
 * page, the Word desk, the Funnies, the Puzzles page, Arts, the back page. A
 * kind absent from this table has no generator yet and simply never appears.
 *
 * Imported dynamically, and per-module rather than through a barrel, for two
 * reasons: the generators read the Bible corpus, the lexicon index and the print
 * audit off disk, so a unit test of the argv layer has no business pulling them
 * in; and one broken generator file names itself in the stack trace instead of
 * taking down a shared index.
 */
async function loadGenerators(): Promise<{ kind: EditionKind; generate: GeneratorFn }[]> {
  const [lead, rail, season, word, practice, strip, puzzles, gallery, prayer] = await Promise.all([
    import('../../src/lib/edition/generators/lead'),
    import('../../src/lib/edition/generators/rail'),
    import('../../src/lib/edition/generators/season'),
    import('../../src/lib/edition/generators/word'),
    import('../../src/lib/edition/generators/practice'),
    import('../../src/lib/edition/generators/strip'),
    import('../../src/lib/edition/generators/puzzles'),
    import('../../src/lib/edition/generators/gallery'),
    import('../../src/lib/edition/generators/prayer'),
  ])

  return [
    { kind: 'lead', generate: lead.generateLead },
    { kind: 'rail', generate: rail.generateRail },
    { kind: 'season', generate: season.generateSeason },
    { kind: 'word', generate: word.generateWord },
    { kind: 'practice', generate: practice.generatePractice },
    { kind: 'strip', generate: strip.generateStrip },
    { kind: 'crossword', generate: puzzles.generateCrossword },
    { kind: 'unscramble', generate: puzzles.generateUnscramble },
    { kind: 'quiz', generate: puzzles.generateQuiz },
    { kind: 'gallery', generate: gallery.generateGallery },
    { kind: 'prayer', generate: prayer.generatePrayer },
  ]
}

const DETERMINISTIC = new Set<EditionKind>(DETERMINISTIC_KINDS)

/**
 * Deterministic sections are computed from assets we own — there is nothing for
 * a human to review in a crossword built from the BSB — so they go straight to
 * the page. Reviewed kinds keep whatever status their generator chose and wait
 * in the queue.
 */
export function promote(item: EditionItem): EditionItem {
  if (DETERMINISTIC.has(item.kind) && item.status === 'approved') {
    return { ...item, status: 'published' }
  }
  return item
}

interface SummaryRow {
  date: string
  kind: EditionKind
  count: number
  statuses: string
}

function printSummary(rows: SummaryRow[], dryRun: boolean): void {
  const dateW = Math.max('DATE'.length, ...rows.map((r) => r.date.length))
  const kindW = Math.max('KIND'.length, ...rows.map((r) => r.kind.length))
  const countW = Math.max('ITEMS'.length, ...rows.map((r) => String(r.count).length))

  console.log('')
  console.log(
    `${'DATE'.padEnd(dateW)}  ${'KIND'.padEnd(kindW)}  ${'ITEMS'.padStart(countW)}  STATUS`,
  )
  console.log(`${'-'.repeat(dateW)}  ${'-'.repeat(kindW)}  ${'-'.repeat(countW)}  ------`)
  for (const row of rows) {
    console.log(
      `${row.date.padEnd(dateW)}  ${row.kind.padEnd(kindW)}  ` +
        `${String(row.count).padStart(countW)}  ${row.statuses}`,
    )
  }
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  console.log('')
  console.log(
    dryRun
      ? `[edition] DRY RUN — ${total} item(s) generated, nothing written`
      : `[edition] ${total} item(s) written`,
  )
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  const args = parseArgs(process.argv.slice(2))
  const dates = datesInWindow(args.from, args.days)

  console.log(
    `[edition] building ${dates.length} edition(s): ${dates[0]}` +
      (dates.length > 1 ? ` → ${dates[dates.length - 1]}` : '') +
      (args.kinds ? ` — kinds: ${args.kinds.join(', ')}` : ' — all kinds') +
      (args.dryRun ? ' — DRY RUN' : ''),
  )

  // Always load .env.local: generators need their own credentials too (the
  // Sunday Lead calls the brain router), so a dry run has to see the same
  // environment a real run does. Only the Supabase write credentials are
  // dry-run-optional, because a dry run writes nothing.
  loadEnvLocal(repoRoot)
  if (!args.dryRun) assertSupabaseEnv()

  const available = await loadGenerators()

  // `parseArgs` only proves a requested kind is in the CONTRACT; several
  // contract kinds (guide, screening, witness, letter, notice) have no
  // generator yet. Asking for one is a typo or a wrong assumption, and dropping
  // it silently means `--kinds=prayer,guide` succeeds having built no guide at
  // all. Every requested kind must be buildable or the run does not start.
  if (args.kinds) {
    const buildable = new Set<EditionKind>(available.map((g) => g.kind))
    const unbuildable = args.kinds.filter((kind) => !buildable.has(kind))
    if (unbuildable.length > 0) {
      throw new Error(
        `--kinds: no generator for ${unbuildable.join(', ')}. ` +
          `Generators exist for: ${available.map((g) => g.kind).join(', ')}`,
      )
    }
  }

  const requested = args.kinds ? new Set<EditionKind>(args.kinds) : null
  const generators = available.filter((g) => !requested || requested.has(g.kind))

  const summary: SummaryRow[] = []
  const generated: EditionItem[] = []

  for (const date of dates) {
    const asDate = new Date(`${date}T00:00:00Z`)
    for (const { kind, generate } of generators) {
      // Deliberately unguarded: a generator throw must kill the run.
      const items = (await generate(asDate)).map(promote)

      for (const item of items) {
        if (item.kind !== kind) {
          throw new Error(`${kind} generator produced a "${item.kind}" item for ${date}`)
        }
        if (item.publishDate !== date) {
          throw new Error(
            `${kind} generator produced an item dated ${item.publishDate} while building ${date}`,
          )
        }
      }

      generated.push(...items)
      summary.push({
        date,
        kind,
        count: items.length,
        statuses: [...new Set(items.map((i) => i.status))].sort().join(', ') || '—',
      })
    }
  }

  if (args.dryRun) {
    // A real run validates inside `upsertEditionItems`, which a dry run never
    // reaches. Without this the preview would happily print an edition the
    // write would reject — the one thing a preview exists to catch. Same guard,
    // same message shape, so a dry-run failure reads exactly like the real one.
    for (const item of generated) {
      const err = validateEditionItem(item)
      if (err) {
        throw new Error(
          `invalid edition item (${item.kind} ${item.publishDate} slot ${item.slot}): ${err}`,
        )
      }
    }
    console.log(JSON.stringify(generated, null, 2))
    printSummary(summary, true)
    return
  }

  const { upsertEditionItems } = await import('../../src/lib/edition/store')
  await upsertEditionItems(generated)
  printSummary(summary, false)
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (invokedDirectly) {
  main().catch((err: unknown) => {
    console.error(`[edition] FAILED: ${err instanceof Error ? err.message : String(err)}`)
    if (err instanceof Error && err.stack) console.error(err.stack)
    process.exitCode = 1
  })
}
