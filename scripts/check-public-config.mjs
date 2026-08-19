#!/usr/bin/env node
/**
 * check-public-config.mjs — refuse to build a bundle that is missing its
 * client configuration.
 *
 * `NEXT_PUBLIC_*` is INLINED AT BUILD TIME. A Cloudflare Worker secret does
 * nothing for it, and `.env.local` — which is where these live — is gitignored.
 * So a build from a fresh clone, a CI runner, or a clean git worktree silently
 * succeeds and produces a bundle with no Supabase client config and no Google
 * sign-in. Nothing fails. The deploy reports success. The feature is simply
 * gone, and the only way to notice is to look for it in production.
 *
 * That is exactly what happened on 2026-08-19: a deploy built without
 * `.env.local` removed "Continue with Google" from a site where the flag was
 * set to true, and the Supabase URL vanished from every client chunk.
 *
 * This runs before `next build` and fails loudly instead. It reads the env
 * files itself, in Next's own precedence order, because Next loads them
 * internally and a pre-build script would otherwise see an empty process.env.
 *
 * It prints NAMES ONLY — never values. Anyone debugging a build should be able
 * to paste this output.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Without these the client cannot talk to Supabase or link back to itself. */
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
]

/**
 * Absent means the feature is off, which is legitimate — but silently off is
 * how a working sign-in method disappears, so say which ones are dark.
 */
const OPTIONAL = ['NEXT_PUBLIC_GOOGLE_AUTH_ENABLED']

// Next's precedence: later files do NOT override earlier ones already set.
const ENV_FILES = [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
]

const env = { ...process.env }
const seen = []
for (const file of ENV_FILES) {
  const p = path.join(REPO, file)
  if (!fs.existsSync(p)) continue
  seen.push(file)
  for (const raw of fs.readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    if (env[key] !== undefined) continue // first definition wins, as Next does
    env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
}

const missing = REQUIRED.filter((k) => !env[k])
const dark = OPTIONAL.filter((k) => !env[k])

if (missing.length) {
  console.error('\n[public-config] Refusing to build — client configuration is missing.\n')
  for (const k of missing) console.error(`  MISSING  ${k}`)
  console.error(`\n  Env files found: ${seen.length ? seen.join(', ') : 'NONE'}`)
  console.error(`  Looked in: ${REPO}`)
  console.error(
    '\n  NEXT_PUBLIC_* is inlined at BUILD time. A Worker secret does not help,\n' +
      '  and .env.local is gitignored — a clean checkout needs it copied in:\n' +
      '      cp /path/to/repo/.env.local .\n' +
      '  Building without it produces a bundle with no Supabase client config\n' +
      '  and no Google sign-in, and nothing else will tell you.\n',
  )
  process.exit(1)
}

console.log(
  `[public-config] OK — ${REQUIRED.length} required present` +
    (seen.length ? ` (from ${seen.join(', ')})` : '') +
    (dark.length ? `; dark: ${dark.join(', ')}` : ''),
)
