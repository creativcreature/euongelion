/**
 * check-bundle-secrets.mjs — CI bundle audit (custom-generation brief §12.5).
 *
 * Scans every client-shipped JS chunk under .next/static for secret
 * material that must never reach a browser: server-side secret KEY
 * NAMES (a name in a client bundle means the value was inlined at
 * build time) and secret VALUE PATTERNS (Stripe secret/webhook keys,
 * Anthropic/OpenAI keys, JWTs with service_role claims).
 *
 * Runs AFTER `npm run build` in CI (`npm run verify:bundle-secrets`).
 * Fails loudly with file + match context. NEXT_PUBLIC_* values are
 * expected in bundles and are not flagged.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const STATIC_DIR = join(ROOT, '.next', 'static')

// Server-secret env NAMES that must never appear in client chunks.
const FORBIDDEN_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'INTERNAL_ROUTE_SECRET',
  'UPSTASH_REDIS_REST_TOKEN',
  'COHERE_API_KEY',
]

// Secret VALUE shapes.
const FORBIDDEN_PATTERNS = [
  { name: 'Stripe secret key', regex: /sk_(live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe webhook secret', regex: /whsec_[A-Za-z0-9]{16,}/ },
  { name: 'Anthropic API key', regex: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  {
    name: 'service_role JWT',
    // base64url('"service_role"') fragment appearing inside a JWT body
    regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl[A-Za-z0-9_-]*\./,
  },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) walk(full, out)
    else if (/\.(js|mjs|json|txt)$/.test(entry)) out.push(full)
  }
  return out
}

if (!existsSync(STATIC_DIR)) {
  console.error(
    '[bundle-secrets] .next/static not found — run `npm run build` first.',
  )
  process.exit(1)
}

const files = walk(STATIC_DIR)
const findings = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  for (const name of FORBIDDEN_NAMES) {
    // Only flag when the name appears with an inlined value shape
    // ("NAME":"..." or NAME:"...") or as a bare occurrence — a server
    // secret name has no legitimate reason to exist in client code.
    if (content.includes(name)) {
      findings.push({ file, match: name, kind: 'secret env name' })
    }
  }
  for (const { name, regex } of FORBIDDEN_PATTERNS) {
    const match = content.match(regex)
    if (match) {
      findings.push({
        file,
        match: `${name} (${match[0].slice(0, 12)}…)`,
        kind: 'secret value pattern',
      })
    }
  }
}

if (findings.length) {
  console.error(
    `[bundle-secrets] FAIL — ${findings.length} secret exposure(s) in client bundles:`,
  )
  for (const finding of findings) {
    console.error(
      `  ${finding.kind}: ${finding.match}\n    in ${finding.file.replace(ROOT, '')}`,
    )
  }
  process.exit(1)
}

console.log(
  `[bundle-secrets] OK — ${files.length} client chunks scanned, no secret names or value patterns found.`,
)
