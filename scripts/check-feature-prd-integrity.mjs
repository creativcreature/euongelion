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

if (uniqueIds.length !== 52) {
  fail(`Expected 52 feature IDs in registry, found ${uniqueIds.length}`)
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
