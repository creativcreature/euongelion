#!/usr/bin/env node
/**
 * Apply migration 018 (`listening_progress`) to the Supabase project.
 *
 * Founder-approved 2026-08-16 — the named prod-DDL approval SA-039 §2 requires.
 *
 * Uses the Management API rather than the service-role key, because PostgREST
 * exposes no DDL. Needs SUPABASE_ACCESS_TOKEN (a Personal Access Token) in
 * .env.local.
 *
 * SAFE TO RE-RUN: every statement is IF NOT EXISTS / idempotent, and the script
 * reports what it found before and after rather than assuming.
 *
 *   node scripts/apply-migration-018.mjs          # apply
 *   node scripts/apply-migration-018.mjs --check  # report only, change nothing
 */
import 'dotenv/config'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const PAT = process.env.SUPABASE_ACCESS_TOKEN
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const REF = URL_.replace('https://', '').split('.')[0]
const CHECK_ONLY = process.argv.includes('--check')

if (!PAT || !REF) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL.')
  process.exit(1)
}

async function query(sql, label) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      },
    )
    const text = await response.text()
    if (response.ok) {
      console.log(`  ${label}: OK ${text.slice(0, 160)}`)
      return JSON.parse(text)
    }
    // The API gateway 502s intermittently on larger bodies; retry before
    // reporting a failure, so a transient blip is not mistaken for a rejection.
    if (attempt === 3) {
      console.error(`  ${label}: FAILED ${response.status} ${text.slice(0, 240)}`)
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}

const STATEMENTS = [
  [
    `CREATE TABLE IF NOT EXISTS listening_progress (
       id               TEXT PRIMARY KEY,
       user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       devotional_slug  TEXT NOT NULL,
       position_seconds REAL NOT NULL DEFAULT 0,
       duration_seconds REAL,
       seconds_listened REAL NOT NULL DEFAULT 0,
       completed_at     TIMESTAMPTZ,
       first_played_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       last_played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (user_id, devotional_slug)
     );`,
    'create table',
  ],
  [
    `CREATE INDEX IF NOT EXISTS idx_listening_progress_user
       ON listening_progress (user_id, last_played_at DESC);`,
    'create index',
  ],
  [`ALTER TABLE listening_progress ENABLE ROW LEVEL SECURITY;`, 'enable rls'],
]

console.log(`Project: ${REF}`)
console.log('\nBEFORE:')
const before = await query(
  `select to_regclass('public.listening_progress')::text as tbl;`,
  'table exists?',
)

if (before?.[0]?.tbl && CHECK_ONLY) {
  console.log('\nAlready applied. Nothing to do.')
  process.exit(0)
}

if (CHECK_ONLY) {
  console.log('\n--check: not applied, and no changes made.')
  process.exit(0)
}

console.log('\nAPPLYING:')
for (const [sql, label] of STATEMENTS) {
  await query(sql, label)
}

console.log('\nAFTER:')
await query(
  `select column_name, data_type
     from information_schema.columns
    where table_name = 'listening_progress'
    order by ordinal_position;`,
  'columns',
)
await query(
  `select relrowsecurity as rls_enabled
     from pg_class where relname = 'listening_progress';`,
  'rls',
)
await query(
  `select indexname from pg_indexes where tablename = 'listening_progress';`,
  'indexes',
)

console.log('\nDone.')
