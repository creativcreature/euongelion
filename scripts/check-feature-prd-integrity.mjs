#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const PRD_DIR = path.join(ROOT, 'docs', 'feature-prds')
const REGISTRY = path.join(PRD_DIR, 'FEATURE-PRD-REGISTRY.yaml')
const INDEX = path.join(PRD_DIR, 'FEATURE-PRD-INDEX.md')

function fail(message) {
  console.error(`\n[feature-prd-integrity] ${message}\n`)
  process.exit(1)
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    fail(`Required file missing: ${path.relative(ROOT, file)}`)
  }
}

const registry = read(REGISTRY)
const index = read(INDEX)

const ids = [...registry.matchAll(/\bF-\d{3}\b/g)].map((m) => m[0])
const uniqueIds = Array.from(new Set(ids)).sort()

// Bumped whenever a feature is added. Note the shape of this guard: the count
// is hardcoded, so adding a PRD and forgetting this line blocks EVERY commit in
// the repo, not just the one that added it. F-090 did exactly that, and F-092
// repeated it a day later — the failure is not attributable from the message,
// so whoever hits it next pays for someone else's omission.
//
// 92: F-092 (editable highlights).
if (uniqueIds.length !== 92) {
  fail(
    `Expected 92 feature IDs in registry, found ${uniqueIds.length}. ` +
      `If you just added a PRD, bump this number in the same commit.`,
  )
}

for (const id of uniqueIds) {
  const file = path.join(PRD_DIR, `${id}.md`)
  if (!fs.existsSync(file)) {
    fail(`Missing PRD file: docs/feature-prds/${id}.md`)
  }

  const prd = read(file)
  if (!prd.includes('## Methodology References')) {
    fail(`Missing methodology section in ${id}.md`)
  }
  if (!prd.includes('### Desktop') || !prd.includes('### Mobile')) {
    fail(`Missing desktop/mobile contracts in ${id}.md`)
  }

  if (!index.includes(id)) {
    fail(`Feature ID ${id} missing from FEATURE-PRD-INDEX.md`)
  }
}

console.log('[feature-prd-integrity] OK')
