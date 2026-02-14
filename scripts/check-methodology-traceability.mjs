#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const METHOD_DIR = path.join(ROOT, 'docs', 'methodology')
const PRD_DIR = path.join(ROOT, 'docs', 'feature-prds')

function fail(message) {
  console.error(`\n[methodology-traceability] ${message}\n`)
  process.exit(1)
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    fail(`Required file missing: ${path.relative(ROOT, file)}`)
  }
}

const requiredMethodDocs = [
  'M00-EUANGELION-UNIFIED-METHODOLOGY.md',
  'M00-METHODOLOGY-TRACEABILITY-MATRIX.md',
  'M00-DUPLICATION-RESOLUTION-LOG.md',
  'METHOD-SOURCE-INDEX.md',
  'M01-ENGENIUS-SITE-ARCHITECTURE.md',
  'M02-SAAS-WEB-BEST-PRACTICES.md',
  'M03-USERLYTICS-IA-RESEARCH.md',
  'M04-NAVIGATION-DESIGN-BEST-PRACTICES.md',
  'M05-BAYMARD-SELF-SERVICE-UX.md',
  'M06-CONNECTIVE-IA-UX-STRATEGY.md',
]

for (const file of requiredMethodDocs) {
  read(path.join(METHOD_DIR, file))
}

const methodCounts = new Map([
  ['M01', 0],
  ['M02', 0],
  ['M03', 0],
  ['M04', 0],
  ['M05', 0],
  ['M06', 0],
])

for (let i = 1; i <= 50; i += 1) {
  const id = `F-${String(i).padStart(3, '0')}`
  const file = path.join(PRD_DIR, `${id}.md`)
  const content = read(file)

  if (!content.includes('## Methodology References')) {
    fail(`${id}.md missing methodology references section`)
  }
  if (!/\bM00\b/.test(content)) {
    fail(`${id}.md must include M00 reference`)
  }

  for (const method of methodCounts.keys()) {
    if (new RegExp(`\\b${method}\\b`).test(content)) {
      methodCounts.set(method, (methodCounts.get(method) || 0) + 1)
    }
  }
}

for (const [method, count] of methodCounts.entries()) {
  if (count === 0) {
    fail(`No feature PRD references ${method}`)
  }
}

console.log('[methodology-traceability] OK')
