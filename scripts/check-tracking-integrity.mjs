#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const DECISIONS_FILE = path.join(ROOT, 'docs', 'production-decisions.yaml')
const PACKAGE_FILE = path.join(ROOT, 'package.json')
const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md')
const CLAUDE_FILE = path.join(ROOT, 'CLAUDE.md')
const PRE_COMMIT_FILE = path.join(ROOT, '.husky', 'pre-commit')
const CI_FILE = path.join(ROOT, '.github', 'workflows', 'ci.yml')

function fail(message) {
  console.error(`\n[tracking-integrity] ${message}\n`)
  process.exit(1)
}

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    fail(`Required file missing: ${path.relative(ROOT, file)}`)
  }
}

function parseSectionList(yaml, sectionName) {
  const sectionMatch = yaml.match(
    new RegExp(`\\n\\s{2}${sectionName}:\\n([\\s\\S]*?)(\\n\\s{2}[a-z_]+:|$)`),
  )
  if (!sectionMatch) return []

  return sectionMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean)
}

const decisionsYaml = readFile(DECISIONS_FILE)
const packageJson = JSON.parse(readFile(PACKAGE_FILE))
const changelog = readFile(CHANGELOG_FILE)
const claude = readFile(CLAUDE_FILE)
const preCommit = readFile(PRE_COMMIT_FILE)
const ciWorkflow = readFile(CI_FILE)

const requiredDocs = parseSectionList(decisionsYaml, 'required_tracking_docs')
if (requiredDocs.length === 0) {
  fail(
    'contracts.required_tracking_docs is empty in docs/production-decisions.yaml',
  )
}

for (const rel of requiredDocs) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) {
    fail(`Tracking contract file missing: ${rel}`)
  }
}

const requiredClaudeReferences = parseSectionList(
  decisionsYaml,
  'required_claude_references',
)
if (requiredClaudeReferences.length === 0) {
  fail(
    'contracts.required_claude_references is empty in docs/production-decisions.yaml',
  )
}

for (const reference of requiredClaudeReferences) {
  if (!claude.includes(reference)) {
    fail(`CLAUDE.md missing required reference: ${reference}`)
  }
}

const version = String(packageJson.version || '').trim()
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(
    `package.json version must follow semver MAJOR.MINOR.PATCH. Received: "${version}"`,
  )
}

if (!changelog.includes(`**Version:** ${version}`)) {
  fail(
    `CHANGELOG.md must include current package version marker "**Version:** ${version}"`,
  )
}

if (!preCommit.includes('npm run verify:tracking')) {
  fail('.husky/pre-commit must run "npm run verify:tracking"')
}
if (!preCommit.includes('npm run verify:feature-prds')) {
  fail('.husky/pre-commit must run "npm run verify:feature-prds"')
}
if (!preCommit.includes('npm run verify:feature-prd-link')) {
  fail('.husky/pre-commit must run "npm run verify:feature-prd-link"')
}
if (!preCommit.includes('npm run verify:governance-alignment')) {
  fail('.husky/pre-commit must run "npm run verify:governance-alignment"')
}
if (!preCommit.includes('npm run verify:methodology-traceability')) {
  fail('.husky/pre-commit must run "npm run verify:methodology-traceability"')
}
if (!preCommit.includes('npm run verify:folder-structure')) {
  fail('.husky/pre-commit must run "npm run verify:folder-structure"')
}
if (!preCommit.includes('npm run verify:appstore-gate')) {
  fail('.husky/pre-commit must run "npm run verify:appstore-gate"')
}

if (!ciWorkflow.includes('npm run verify:tracking')) {
  fail('.github/workflows/ci.yml must run "npm run verify:tracking"')
}
if (!ciWorkflow.includes('npm run verify:feature-prds')) {
  fail('.github/workflows/ci.yml must run "npm run verify:feature-prds"')
}
if (!ciWorkflow.includes('npm run verify:governance-alignment')) {
  fail('.github/workflows/ci.yml must run "npm run verify:governance-alignment"')
}
if (!ciWorkflow.includes('npm run verify:methodology-traceability')) {
  fail('.github/workflows/ci.yml must run "npm run verify:methodology-traceability"')
}
if (!ciWorkflow.includes('npm run verify:folder-structure')) {
  fail('.github/workflows/ci.yml must run "npm run verify:folder-structure"')
}
if (!ciWorkflow.includes('npm run verify:appstore-gate')) {
  fail('.github/workflows/ci.yml must run "npm run verify:appstore-gate"')
}

console.log('[tracking-integrity] OK')
