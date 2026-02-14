#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()

const requiredDirs = [
  'docs/feature-prds',
  'docs/methodology',
  'docs/appstore',
  'docs/runbooks',
]

const frozenDirs = [
  'user-references',
  'docs/user refmat',
]

function fail(message) {
  console.error(`\n[folder-structure-integrity] ${message}\n`)
  process.exit(1)
}

for (const rel of [...requiredDirs, ...frozenDirs]) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    fail(`Required directory missing: ${rel}`)
  }
}

const stagedStatus = execSync('git diff --cached --name-status --diff-filter=DR', {
  encoding: 'utf8',
})
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

for (const line of stagedStatus) {
  const parts = line.split(/\s+/)
  const status = parts[0]
  const paths = parts.slice(1)

  for (const frozen of frozenDirs) {
    const hitsFrozenPath = paths.some((p) => p.startsWith(frozen + '/') || p === frozen)
    if (hitsFrozenPath) {
      fail(`Staged destructive change (${status}) touches frozen directory: ${frozen}`)
    }
  }
}

console.log('[folder-structure-integrity] OK')
