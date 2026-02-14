#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

const requiredFiles = [
  'docs/appstore/APP-STORE-RELEASE-GATE.md',
  'docs/appstore/APP-STORE-ASSET-TRACKER.md',
  'docs/appstore/APP-REVIEW-NOTES-TEMPLATE.md',
]

function fail(message) {
  console.error(`\n[appstore-gate] ${message}\n`)
  process.exit(1)
}

function read(rel) {
  const abs = path.join(ROOT, rel)
  try {
    return fs.readFileSync(abs, 'utf8')
  } catch {
    fail(`Required file missing: ${rel}`)
  }
}

for (const file of requiredFiles) {
  read(file)
}

const gate = read('docs/appstore/APP-STORE-RELEASE-GATE.md')
const requiredHeadings = [
  '## 1. App Store Connect Setup',
  '## 2. Build Preparation',
  '## 3. App Store Assets',
  '## 4. Metadata Compliance',
  '## 5. Technical Requirements',
  '## 6. Privacy and Permissions',
  '## 7. Pre-Submission Testing',
  '## 8. App Review Preparation',
]

for (const heading of requiredHeadings) {
  if (!gate.includes(heading)) {
    fail(`Release gate missing section: ${heading}`)
  }
}

console.log('[appstore-gate] OK')
