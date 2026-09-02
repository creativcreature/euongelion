/**
 * USER COUNT — read-only headcount for the live Supabase project.
 *
 * Usage:
 *   node scripts/ops/user-count.mjs           # summary
 *   node scripts/ops/user-count.mjs --json    # machine-readable
 *
 * Reports both sides of the account record, because they can disagree:
 *   auth.users    — the raw Supabase Auth record, created the moment a signup
 *                   succeeds. Source of truth for "how many people signed up".
 *   public.users  — the app profile row, created afterwards by
 *                   src/app/auth/callback/route.ts. A signup that died between
 *                   the two leaves an auth user with no profile.
 *
 * Any drift between them is listed explicitly (orphaned auth users, profiles
 * with no auth record) rather than averaged away.
 *
 * This script only reads. It never writes, deletes, or modifies anything.
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// ---------------------------------------------------------------------------
// Env loading (.env.local, same convention as scripts/ops/fresh-start-reset.mjs)
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

const JSON_OUT = process.argv.includes('--json')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[user-count] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}
const SUPABASE_HOST = new URL(SUPABASE_URL).host

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------
async function fetchAuthUsers() {
  const users = []
  const PER_PAGE = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    })
    if (error) throw new Error(`auth listUsers page ${page}: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < PER_PAGE) break
  }
  return users
}

async function fetchProfiles() {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, subscription_tier, onboarding_completed, created_at')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`public.users select: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
  }
  return rows
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000
const since = (days) => Date.now() - days * DAY_MS
const newerThan = (rows, field, days) =>
  rows.filter((r) => r[field] && Date.parse(r[field]) >= since(days)).length

function tally(rows, field, fallback) {
  const counts = {}
  for (const row of rows) {
    const key = row[field] ?? fallback
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

const [authUsers, profiles] = await Promise.all([
  fetchAuthUsers(),
  fetchProfiles(),
])

const profileIds = new Set(profiles.map((p) => p.id))
const authIds = new Set(authUsers.map((u) => u.id))

const report = {
  host: SUPABASE_HOST,
  checkedAt: new Date().toISOString(),
  authUsers: {
    total: authUsers.length,
    confirmed: authUsers.filter((u) => u.email_confirmed_at || u.confirmed_at)
      .length,
    everSignedIn: authUsers.filter((u) => u.last_sign_in_at).length,
    activeLast30d: newerThan(authUsers, 'last_sign_in_at', 30),
    newLast7d: newerThan(authUsers, 'created_at', 7),
    newLast30d: newerThan(authUsers, 'created_at', 30),
    byProvider: tally(
      authUsers.map((u) => ({ p: u.app_metadata?.provider ?? 'unknown' })),
      'p',
    ),
  },
  profiles: {
    total: profiles.length,
    onboardingCompleted: profiles.filter((p) => p.onboarding_completed).length,
    byTier: tally(profiles, 'subscription_tier', 'unset'),
  },
  drift: {
    authWithoutProfile: authUsers
      .filter((u) => !profileIds.has(u.id))
      .map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })),
    profileWithoutAuth: profiles
      .filter((p) => !authIds.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, created_at: p.created_at })),
  },
}

if (JSON_OUT) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const pairs = (obj) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join('  ') || '(none)'

console.log(`\nEuangelion user count — ${report.host}`)
console.log(`Checked ${report.checkedAt}\n`)

console.log(`auth.users (signups)      ${report.authUsers.total}`)
console.log(`  email confirmed         ${report.authUsers.confirmed}`)
console.log(`  ever signed in          ${report.authUsers.everSignedIn}`)
console.log(`  signed in last 30d      ${report.authUsers.activeLast30d}`)
console.log(
  `  new last 7d / 30d       ${report.authUsers.newLast7d} / ${report.authUsers.newLast30d}`,
)
console.log(`  by provider             ${pairs(report.authUsers.byProvider)}`)

console.log(`\npublic.users (profiles)   ${report.profiles.total}`)
console.log(`  onboarding completed    ${report.profiles.onboardingCompleted}`)
console.log(`  by tier                 ${pairs(report.profiles.byTier)}`)

const { authWithoutProfile, profileWithoutAuth } = report.drift
if (authWithoutProfile.length === 0 && profileWithoutAuth.length === 0) {
  console.log(`\ndrift                     none — both tables agree`)
} else {
  console.log(`\ndrift`)
  for (const u of authWithoutProfile) {
    console.log(
      `  auth user, no profile   ${u.email ?? '(no email)'}  ${u.id}  ${u.created_at}`,
    )
  }
  for (const p of profileWithoutAuth) {
    console.log(
      `  profile, no auth user   ${p.email ?? '(no email)'}  ${p.id}  ${p.created_at}`,
    )
  }
}
console.log('')
