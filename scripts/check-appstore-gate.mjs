#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

const requiredFiles = [
  'docs/appstore/APP-STORE-RELEASE-GATE.md',
  'docs/appstore/APP-STORE-ASSET-TRACKER.md',
  'docs/appstore/APP-REVIEW-NOTES-TEMPLATE.md',
  'docs/appstore/APP-STORE-METADATA.json',
  'docs/appstore/APP-STORE-TEST-EVIDENCE.md',
  'docs/IOS-APP-STORE-SUBMISSION.md',
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

function mustInclude(content, needle, label) {
  if (!content.includes(needle)) {
    fail(`${label} missing required content: ${needle}`)
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
  mustInclude(gate, heading, 'Release gate')
}

mustInclude(gate, '## Rejection-risk emphasis', 'Release gate')

const tracker = read('docs/appstore/APP-STORE-ASSET-TRACKER.md')
for (const marker of [
  'App icon 1024x1024',
  'iPhone screenshots',
  'Description <= 4000 chars',
  'Keywords <= 100 chars',
]) {
  mustInclude(tracker, marker, 'Asset tracker')
}

const reviewNotes = read('docs/appstore/APP-REVIEW-NOTES-TEMPLATE.md')
for (const marker of [
  '## Build context',
  '## Reviewer guidance',
  '## Credentials',
  '## Contact',
]) {
  mustInclude(reviewNotes, marker, 'Review notes template')
}

const metadataRaw = read('docs/appstore/APP-STORE-METADATA.json')
let metadata = null
try {
  metadata = JSON.parse(metadataRaw)
} catch {
  fail('APP-STORE-METADATA.json must be valid JSON')
}

const requiredMetadataFields = [
  'appName',
  'subtitle',
  'description',
  'keywords',
  'supportUrl',
  'privacyPolicyUrl',
  'marketingUrl',
  'categoryPrimary',
  'ageRating',
  'copyright',
]

for (const field of requiredMetadataFields) {
  if (!metadata[field] || typeof metadata[field] !== 'string') {
    fail(`Metadata missing required string field: ${field}`)
  }
}

if (metadata.description.length > 4000) {
  fail('Metadata description exceeds 4000 characters')
}

if (metadata.keywords.length > 100) {
  fail('Metadata keywords exceed 100 characters')
}

for (const urlField of ['supportUrl', 'privacyPolicyUrl', 'marketingUrl']) {
  const value = metadata[urlField]
  if (!value.startsWith('https://')) {
    fail(`Metadata field ${urlField} must use https:// URL`)
  }
}

if (
  !metadata.reviewContact ||
  typeof metadata.reviewContact !== 'object' ||
  typeof metadata.reviewContact.email !== 'string' ||
  !metadata.reviewContact.email.includes('@')
) {
  fail('Metadata reviewContact.email must be configured')
}

const iosSubmission = read('docs/IOS-APP-STORE-SUBMISSION.md')
for (const marker of [
  'app.euangelion.premium.monthly',
  'app.euangelion.premium.annual',
  'npm run verify:ios-readiness',
]) {
  mustInclude(iosSubmission, marker, 'iOS submission doc')
}

const evidence = read('docs/appstore/APP-STORE-TEST-EVIDENCE.md')
for (const marker of [
  '## Build Under Review',
  '## Device Matrix',
  '## Core Flow Evidence',
  '## Compliance Evidence',
]) {
  mustInclude(evidence, marker, 'App Store test evidence')
}

console.log('[appstore-gate] OK')
