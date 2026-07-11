/**
 * FRESH START — user-data backup + reset (custom-generation brief, Section 8)
 *
 * FOUNDER-TRIGGERED ONLY. This script is never run by automation or agents.
 *
 * Usage (three separate, deliberate steps):
 *   node scripts/ops/fresh-start-reset.mjs backup
 *       Export every user-data table + all auth users to a dated archive under
 *       backups/, then re-read the archive from disk and verify it (row counts,
 *       checksums, live-count match). Wipe is impossible without a VERIFIED
 *       manifest from this step.
 *
 *   node scripts/ops/fresh-start-reset.mjs stripe-review
 *       List Stripe customers (report only — this script NEVER deletes or
 *       modifies anything on the Stripe side; founder decides separately).
 *
 *   node scripts/ops/fresh-start-reset.mjs wipe --manifest backups/<dir>/manifest.json [--dry-run] [--stripe-reviewed] [--include-cost-ledger]
 *       Purge all user data. Hard gates, in order:
 *         1. must run in an interactive terminal (no CI, no pipes)
 *         2. manifest must exist and be verified:true
 *         3. live row counts must exactly match the manifest (stale backup → abort)
 *         4. every live table must be classified purge/keep (unknown table → abort)
 *         5. if Stripe customers exist, --stripe-reviewed must be passed
 *         6. typed confirmation naming the target Supabase host
 *       Then deletes user rows table-by-table (children first) and hard-deletes
 *       every auth user (shouldSoftDelete=false → no tombstone: any email can
 *       sign up again as a brand-new account with zero residual state).
 *
 * Untouched, always: curated content (series, devotionals, soul_audit_questions,
 * generated_illustrations), the reference-library storage bucket, and all Stripe
 * objects. soul_audit_cost_ledger (spend accounting) is kept by default; pass
 * --include-cost-ledger to purge it too.
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Optional: STRIPE_SECRET_KEY (for stripe-review and the wipe Stripe gate).
 */

import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ---------------------------------------------------------------------------
// Env loading (.env.local, same convention as scripts/seed-series.ts)
// ---------------------------------------------------------------------------
function loadEnvLocal() {
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let value = m[2]
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[fresh-start] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}
const SUPABASE_HOST = new URL(SUPABASE_URL).host

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Table classification
//
// PURGE_TABLES: user rows, sessions, plan progress, user-generated records.
// Ordered children → parents so FK constraints never block a delete.
// Tables that do not exist in the live DB are skipped (recorded as 'absent').
// ---------------------------------------------------------------------------
const PURGE_TABLES = [
  'devotional_day_citations',
  'devotional_plan_days',
  'soul_audit_jobs',
  'audit_selections',
  'audit_option_telemetry',
  'audit_options',
  'consent_records',
  'devotional_plan_instances',
  'audit_runs',
  'annotations',
  'session_bookmarks',
  'bookmarks',
  'user_progress',
  'push_subscriptions',
  'soul_audit_responses',
  'soul_audit_sessions',
  'scheduled_series_swap',
  'archived_series',
  'active_series',
  'mock_account_sessions',
  'user_sessions',
  'soul_audit_daily_counters',
  'users', // public.users last (children reference it); auth.users after this
]

// Curated / platform content — NEVER touched by this script.
const KEEP_TABLES = [
  'series',
  'devotionals',
  'soul_audit_questions',
  'generated_illustrations',
]

// Financial/ops accounting — kept by default, purged only with --include-cost-ledger.
const COST_LEDGER_TABLE = 'soul_audit_cost_ledger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const isMissingTableError = (error) =>
  error &&
  (error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|Could not find the table/i.test(error.message || ''))

async function liveCount(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) {
    if (isMissingTableError(error)) return { absent: true, count: 0 }
    throw new Error(`count ${table}: ${error.message}`)
  }
  return { absent: false, count: count ?? 0 }
}

async function exportTable(table) {
  const rows = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + PAGE - 1)
    if (error) {
      if (isMissingTableError(error)) return { absent: true, rows: [] }
      throw new Error(`export ${table}: ${error.message}`)
    }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return { absent: false, rows }
}

async function exportAuthUsers() {
  const users = []
  const PER_PAGE = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    })
    if (error) throw new Error(`listUsers page ${page}: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < PER_PAGE) break
  }
  return users
}

/** Enumerate every table PostgREST exposes (public schema) via its OpenAPI root. */
async function listExposedTables() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`OpenAPI enumeration failed: HTTP ${res.status}`)
  const spec = await res.json()
  return Object.keys(spec.paths || {})
    .filter((p) => p !== '/' && !p.includes('rpc'))
    .map((p) => p.replace(/^\//, '').split('?')[0])
    .filter((name, i, arr) => name && arr.indexOf(name) === i)
    .sort()
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer)
    }),
  )
}

// ---------------------------------------------------------------------------
// Command: backup
// ---------------------------------------------------------------------------
async function cmdBackup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(ROOT, 'backups', `fresh-start-${stamp}`)
  mkdirSync(dir, { recursive: true })
  // The archive contains user PII — make the whole backups tree self-ignoring.
  writeFileSync(join(ROOT, 'backups', '.gitignore'), '*\n')

  console.log(`[backup] target project: ${SUPABASE_HOST}`)
  console.log(`[backup] archive: ${dir}\n`)

  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseHost: SUPABASE_HOST,
    tables: {},
    authUsers: null,
    verified: false,
    verifiedAt: null,
  }

  // Export the ledger too (backup is generous even though wipe keeps it by default).
  const exportList = [...PURGE_TABLES, COST_LEDGER_TABLE]

  // Include any exposed table we have not classified, so nothing user-ish is
  // ever missing from the archive. (Wipe separately refuses unknown tables.)
  let exposed = []
  try {
    exposed = await listExposedTables()
  } catch (err) {
    console.warn(`[backup] WARN could not enumerate live tables: ${err.message}`)
  }
  const classified = new Set([...PURGE_TABLES, ...KEEP_TABLES, COST_LEDGER_TABLE])
  const unknown = exposed.filter((t) => !classified.has(t))
  if (unknown.length) {
    console.warn(
      `[backup] WARN unclassified live tables (exported for safety, wipe will refuse until classified): ${unknown.join(', ')}`,
    )
    exportList.push(...unknown)
  }

  for (const table of exportList) {
    const { absent, rows } = await exportTable(table)
    if (absent) {
      manifest.tables[table] = { absent: true, rows: 0 }
      console.log(`  ${table}: absent (skipped)`)
      continue
    }
    const file = `${table}.json`
    const body = JSON.stringify(rows, null, 2)
    writeFileSync(join(dir, file), body)
    manifest.tables[table] = {
      absent: false,
      rows: rows.length,
      file,
      sha256: sha256(body),
    }
    console.log(`  ${table}: ${rows.length} rows`)
  }

  const authUsers = await exportAuthUsers()
  const authBody = JSON.stringify(authUsers, null, 2)
  writeFileSync(join(dir, 'auth_users.json'), authBody)
  manifest.authUsers = {
    count: authUsers.length,
    file: 'auth_users.json',
    sha256: sha256(authBody),
  }
  console.log(`  auth.users: ${authUsers.length} users`)

  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // -------------------------------------------------------------------------
  // HARD GATE: verify the archive is readable before it can authorize a wipe.
  // Re-read every file from disk, re-parse, re-hash, and re-count live rows.
  // -------------------------------------------------------------------------
  console.log('\n[verify] re-reading archive from disk…')
  let ok = true
  for (const [table, meta] of Object.entries(manifest.tables)) {
    if (meta.absent) continue
    const raw = readFileSync(join(dir, meta.file), 'utf8')
    const parsed = JSON.parse(raw)
    const live = await liveCount(table)
    const pass =
      Array.isArray(parsed) &&
      parsed.length === meta.rows &&
      sha256(raw) === meta.sha256 &&
      live.count === meta.rows
    if (!pass) {
      ok = false
      console.error(
        `  FAIL ${table}: file=${parsed.length} manifest=${meta.rows} live=${live.count}`,
      )
    } else {
      console.log(`  ok ${table} (${meta.rows} rows, checksum + live count match)`)
    }
  }
  {
    const raw = readFileSync(join(dir, manifest.authUsers.file), 'utf8')
    const parsed = JSON.parse(raw)
    const liveUsers = await exportAuthUsers()
    const pass =
      parsed.length === manifest.authUsers.count &&
      sha256(raw) === manifest.authUsers.sha256 &&
      liveUsers.length === manifest.authUsers.count
    if (!pass) {
      ok = false
      console.error(
        `  FAIL auth.users: file=${parsed.length} manifest=${manifest.authUsers.count} live=${liveUsers.length}`,
      )
    } else {
      console.log(`  ok auth.users (${manifest.authUsers.count} users)`)
    }
  }

  if (!ok) {
    console.error('\n[verify] BACKUP NOT VERIFIED — wipe is blocked. Re-run backup.')
    process.exit(1)
  }

  manifest.verified = true
  manifest.verifiedAt = new Date().toISOString()
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\n[backup] VERIFIED. Manifest: ${join(dir, 'manifest.json')}`)
  console.log('[backup] Next steps: review "stripe-review" output, then run wipe.')
}

// ---------------------------------------------------------------------------
// Command: stripe-review (report only — never deletes Stripe objects)
// ---------------------------------------------------------------------------
async function listStripeCustomers() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  const { default: Stripe } = await import('stripe')
  const stripe = new Stripe(key)
  const customers = []
  for await (const c of stripe.customers.list({ limit: 100 })) customers.push(c)
  return customers
}

async function cmdStripeReview() {
  const customers = await listStripeCustomers()
  if (customers === null) {
    console.log('[stripe] STRIPE_SECRET_KEY not set — nothing to review.')
    return
  }
  if (!customers.length) {
    console.log('[stripe] No Stripe customers exist. Nothing to decide.')
    return
  }
  console.log(
    `[stripe] ${customers.length} customer(s) — FOR FOUNDER REVIEW ONLY, this script never touches Stripe:\n`,
  )
  for (const c of customers) {
    console.log(
      `  ${c.id}  ${c.email ?? '(no email)'}  created=${new Date(c.created * 1000).toISOString()}  subs=${c.subscriptions?.total_count ?? 'n/a'}`,
    )
  }
  console.log(
    '\n[stripe] Decide delete/archive in the Stripe dashboard yourself; then pass --stripe-reviewed to wipe.',
  )
}

// ---------------------------------------------------------------------------
// Command: wipe
// ---------------------------------------------------------------------------
async function deleteAllRows(table, sampleRow) {
  // PostgREST requires a filter on DELETE. Two passes on any real column
  // (NOT NULL + IS NULL) cover every row regardless of column type.
  const col = sampleRow ? Object.keys(sampleRow)[0] : 'created_at'
  const first = await supabase.from(table).delete().not(col, 'is', null)
  if (first.error && !isMissingTableError(first.error)) {
    throw new Error(`delete ${table} (not-null pass on ${col}): ${first.error.message}`)
  }
  const second = await supabase.from(table).delete().is(col, null)
  if (second.error && !isMissingTableError(second.error)) {
    throw new Error(`delete ${table} (null pass on ${col}): ${second.error.message}`)
  }
}

async function cmdWipe(args) {
  const dryRun = args.includes('--dry-run')
  const includeCostLedger = args.includes('--include-cost-ledger')
  const stripeReviewed = args.includes('--stripe-reviewed')
  const manifestIdx = args.indexOf('--manifest')
  const manifestPath = manifestIdx >= 0 ? args[manifestIdx + 1] : null

  // Gate 1 — interactive terminal only.
  if (!dryRun && !process.stdin.isTTY) {
    console.error('[wipe] Refusing: not an interactive terminal. Run this yourself.')
    process.exit(1)
  }

  // Gate 2 — verified manifest.
  if (!manifestPath || !existsSync(manifestPath)) {
    console.error('[wipe] Refusing: --manifest <path to verified manifest.json> is required.')
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.verified !== true) {
    console.error('[wipe] Refusing: manifest is not verified. Re-run backup.')
    process.exit(1)
  }
  if (manifest.supabaseHost !== SUPABASE_HOST) {
    console.error(
      `[wipe] Refusing: manifest is for ${manifest.supabaseHost}, current env targets ${SUPABASE_HOST}.`,
    )
    process.exit(1)
  }

  // Gate 3 — live counts must match the manifest exactly (stale backup → abort).
  console.log(`[wipe] target project: ${SUPABASE_HOST}`)
  console.log('[wipe] checking live counts against manifest…')
  const plan = []
  let drift = false
  const purgeList = includeCostLedger
    ? [...PURGE_TABLES, COST_LEDGER_TABLE]
    : PURGE_TABLES
  for (const table of purgeList) {
    const meta = manifest.tables[table]
    const live = await liveCount(table)
    if (live.absent) {
      console.log(`  ${table}: absent (skipped)`)
      continue
    }
    const backedUp = meta && !meta.absent ? meta.rows : 0
    if (live.count !== backedUp) {
      drift = true
      console.error(`  DRIFT ${table}: live=${live.count} backup=${backedUp}`)
    } else {
      console.log(`  ${table}: ${live.count} rows (matches backup)`)
    }
    plan.push({ table, rows: live.count })
  }
  const liveUsers = await exportAuthUsers()
  if (liveUsers.length !== (manifest.authUsers?.count ?? 0)) {
    drift = true
    console.error(
      `  DRIFT auth.users: live=${liveUsers.length} backup=${manifest.authUsers?.count ?? 0}`,
    )
  } else {
    console.log(`  auth.users: ${liveUsers.length} users (matches backup)`)
  }
  if (drift) {
    console.error(
      '\n[wipe] Refusing: data changed since the backup. Re-run backup immediately before wiping.',
    )
    process.exit(1)
  }

  // Gate 4 — no unclassified live tables.
  const exposed = await listExposedTables()
  const classified = new Set([...PURGE_TABLES, ...KEEP_TABLES, COST_LEDGER_TABLE])
  const unknown = exposed.filter((t) => !classified.has(t))
  if (unknown.length) {
    console.error(
      `\n[wipe] Refusing: unclassified live tables: ${unknown.join(', ')}\n` +
        '       Classify each as purge/keep in scripts/ops/fresh-start-reset.mjs first.',
    )
    process.exit(1)
  }

  // Gate 5 — Stripe customers require explicit founder acknowledgement.
  const customers = await listStripeCustomers()
  if (customers && customers.length && !stripeReviewed) {
    console.error(
      `\n[wipe] Refusing: ${customers.length} Stripe customer(s) exist. Run "stripe-review", decide on the Stripe side yourself, then pass --stripe-reviewed. (This script never touches Stripe.)`,
    )
    process.exit(1)
  }

  if (dryRun) {
    console.log('\n[wipe] DRY RUN — would delete, in order:')
    for (const p of plan) console.log(`  ${p.table}: ${p.rows} rows`)
    console.log(`  auth.users: ${liveUsers.length} users (hard delete, no tombstones)`)
    console.log(
      `[wipe] kept: ${KEEP_TABLES.join(', ')}${includeCostLedger ? '' : `, ${COST_LEDGER_TABLE}`}, storage buckets, all Stripe objects`,
    )
    return
  }

  // Gate 6 — typed confirmation naming the target host.
  const phrase = `FRESH START ${SUPABASE_HOST}`
  const answer = await ask(
    `\nThis permanently deletes ${liveUsers.length} account(s) and all user data on ${SUPABASE_HOST}.\nType exactly "${phrase}" to proceed: `,
  )
  if (answer.trim() !== phrase) {
    console.error('[wipe] Confirmation did not match. Nothing was deleted.')
    process.exit(1)
  }

  // Execute: tables children→parents, then auth users (hard delete).
  console.log('\n[wipe] deleting…')
  for (const { table } of plan) {
    const meta = manifest.tables[table]
    const sampleFile =
      meta && !meta.absent && meta.rows > 0
        ? JSON.parse(readFileSync(join(dirname(manifestPath), meta.file), 'utf8'))[0]
        : null
    await deleteAllRows(table, sampleFile)
    console.log(`  purged ${table}`)
  }
  for (const user of liveUsers) {
    // shouldSoftDelete=false → hard delete. No tombstone, no email blocklist:
    // the same email can sign up again as a brand-new account.
    const { error } = await supabase.auth.admin.deleteUser(user.id, false)
    if (error) throw new Error(`deleteUser ${user.id}: ${error.message}`)
  }
  console.log(`  hard-deleted ${liveUsers.length} auth user(s)`)

  // Post-wipe verification: every purge table 0, auth users 0.
  console.log('\n[wipe] verifying zero state…')
  let clean = true
  for (const { table } of plan) {
    const live = await liveCount(table)
    if (!live.absent && live.count !== 0) {
      clean = false
      console.error(`  FAIL ${table}: ${live.count} rows remain`)
    }
  }
  const remainingUsers = await exportAuthUsers()
  if (remainingUsers.length !== 0) {
    clean = false
    console.error(`  FAIL auth.users: ${remainingUsers.length} remain`)
  }
  if (!clean) {
    console.error('[wipe] INCOMPLETE — inspect failures above. Backup archive is intact.')
    process.exit(1)
  }
  console.log(
    `\n[wipe] FRESH START COMPLETE on ${SUPABASE_HOST}.\n` +
      '  - zero users, zero sessions, zero user records; no tombstones or blocklists\n' +
      `  - curated content untouched (${KEEP_TABLES.join(', ')})\n` +
      '  - Stripe objects untouched (founder decision, dashboard-side)\n' +
      `  - backup archive: ${dirname(manifestPath)}`,
  )
}

// ---------------------------------------------------------------------------
const [, , command, ...rest] = process.argv
const run =
  command === 'backup'
    ? cmdBackup()
    : command === 'stripe-review'
      ? cmdStripeReview()
      : command === 'wipe'
        ? cmdWipe(rest)
        : Promise.reject(
            new Error('Usage: fresh-start-reset.mjs <backup|stripe-review|wipe> [flags]'),
          )
run.catch((err) => {
  console.error(`[fresh-start] ${err.message}`)
  process.exit(1)
})
