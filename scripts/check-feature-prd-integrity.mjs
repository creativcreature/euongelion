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
// 95: F-095 (red letter). 99: F-102 (notes and journal entries).
// 100: F-101 (Audio Edition transport). 104: F-103, F-104, F-105.
//
// The message reads from the constant now. It previously said "Expected 95"
// while the check tested for 98, so the one person who could act on it was
// told the wrong number — which is most of why this trap kept recurring.
const EXPECTED_FEATURE_IDS = 140
if (uniqueIds.length !== EXPECTED_FEATURE_IDS) {
  fail(
    `Expected ${EXPECTED_FEATURE_IDS} feature IDs in registry, found ${uniqueIds.length}. ` +
      `If you just added a PRD, bump EXPECTED_FEATURE_IDS in the same commit.`,
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
