#!/usr/bin/env node
/**
 * The Daily Bread — edition build runner (SA-090 / F-136).
 *
 *   node scripts/edition/build.mjs --days=N [--from=YYYY-MM-DD] [--kinds=a,b] [--dry-run]
 *
 * This file is a thin launcher. All of the real work — argv parsing, the
 * generator sweep, the deterministic-kind promotion and the Supabase write —
 * lives in `build-inner.mts`, which is TypeScript so it can import the edition
 * contract (`src/lib/edition/kinds.ts`) and the store directly rather than
 * re-describing them in JS. Node cannot execute `.mts`, so this wrapper runs it
 * through `tsx` and forwards the child's exit status verbatim.
 *
 * `tsx` is a declared devDependency and is resolved from `node_modules/.bin`.
 * We deliberately do NOT fall back to `npx tsx`: that would silently download a
 * floating version from the network mid-run — in CI, unpinned — and a runner
 * that quietly changes its own toolchain is exactly the kind of invisible
 * failure this project forbids. Missing `tsx` is a loud, actionable error.
 *
 * Wired as `npm run edition:build`. Same command by hand, same command in
 * `.github/workflows/daily-edition.yml`.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '..', '..')
const INNER = path.join(HERE, 'build-inner.mts')

const USAGE = `The Daily Bread — edition build runner

Usage:
  node scripts/edition/build.mjs [--days=N] [--from=YYYY-MM-DD] [--kinds=a,b] [--dry-run]

Options:
  --days=N            How many consecutive editions to build. Default 1.
  --from=YYYY-MM-DD   First edition date, UTC. Also accepts "today" or
                      "tomorrow". Default: tomorrow.
  --kinds=a,b         Only run these section kinds. Default: every kind that
                      has a generator.
  --dry-run           Print the generated items as JSON and write nothing.
  -h, --help          Show this message.

Environment (read from .env.local when present, otherwise the process env):
  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
`

const args = process.argv.slice(2)

if (args.includes('-h') || args.includes('--help')) {
  process.stdout.write(USAGE)
  process.exit(0)
}

const tsxBin = path.join(
  REPO_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
)

if (!fs.existsSync(tsxBin)) {
  console.error(
    `[edition] tsx is not installed at ${tsxBin}.\n` +
      `[edition] tsx is a declared devDependency — run \`npm ci\` (or \`npm i\`) and try again.`,
  )
  process.exit(1)
}

if (!fs.existsSync(INNER)) {
  console.error(`[edition] missing runner: ${INNER}`)
  process.exit(1)
}

const child = spawn(tsxBin, [INNER, ...args], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: process.env,
})

child.on('error', (err) => {
  console.error(`[edition] failed to launch tsx: ${err.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    // Re-raise so the parent shell sees a real signal death, not a fake 0.
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
