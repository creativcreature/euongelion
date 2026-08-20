#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const DECISIONS_FILE = path.join(ROOT, 'docs', 'production-decisions.yaml')
const SOURCE_OF_TRUTH_FILE = path.join(
  ROOT,
  'docs',
  'PRODUCTION-SOURCE-OF-TRUTH.md',
)

function fail(message) {
  console.error(`\n[production-contracts] ${message}\n`)
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

function parseDecisionIds(yaml) {
  const matches = [...yaml.matchAll(/^\s*-\s*id:\s*([A-Z0-9-]+)/gm)]
  return matches.map((m) => m[1])
}

const decisionsYaml = readFile(DECISIONS_FILE)
readFile(SOURCE_OF_TRUTH_FILE)

const decisionIds = parseDecisionIds(decisionsYaml)
if (decisionIds.length === 0) {
  fail('No decision ids were found in docs/production-decisions.yaml')
}

const requiredFiles = parseSectionList(decisionsYaml, 'required_files')
if (requiredFiles.length === 0) {
  fail('contracts.required_files is empty in docs/production-decisions.yaml')
}

for (const rel of requiredFiles) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) {
    fail(`Contract file missing: ${rel}`)
  }
}

const submitRoutePath = path.join(ROOT, 'src/app/api/soul-audit/submit/route.ts')
const submitRoute = readFile(submitRoutePath)

const forbiddenTokens = parseSectionList(
  decisionsYaml,
  'submit_route_forbidden_tokens',
)
for (const token of forbiddenTokens) {
  if (submitRoute.includes(token)) {
    fail(`submit route contains forbidden token "${token}"`)
  }
}

const requiredSubmitTokens = parseSectionList(decisionsYaml, 'required_submit_tokens')
for (const token of requiredSubmitTokens) {
  if (!submitRoute.includes(token)) {
    fail(`submit route missing required token "${token}"`)
  }
}

const chatRoutePath = path.join(ROOT, 'src/app/api/chat/route.ts')
const chatRoute = readFile(chatRoutePath).toLowerCase()
const requiredChatTokens = parseSectionList(
  decisionsYaml,
  'required_chat_guard_tokens',
)
for (const token of requiredChatTokens) {
  if (!chatRoute.includes(token.toLowerCase())) {
    fail(`chat route missing guard token "${token}"`)
  }
}

const homePage = readFile(path.join(ROOT, 'src/app/page.tsx'))
const soulAuditPage = readFile(path.join(ROOT, 'src/app/soul-audit/page.tsx'))
const submitClientPath = path.join(
  ROOT,
  'src/lib/soul-audit/submit-client.ts',
)
const submitClient = fs.existsSync(submitClientPath)
  ? readFile(submitClientPath)
  : ''
const helperTargetsSubmitRoute = submitClient.includes('/api/soul-audit/submit')

const homeDirectSubmit = homePage.includes('/api/soul-audit/submit')
const homeHelperSubmit = homePage.includes('submitSoulAuditResponse(')
const homeHookSubmit = homePage.includes('useSoulAuditSubmit')
if (!homeDirectSubmit && !homeHelperSubmit && !homeHookSubmit) {
  fail('src/app/page.tsx must submit to /api/soul-audit/submit')
}
if ((homeHelperSubmit || homeHookSubmit) && !helperTargetsSubmitRoute) {
  fail('submit helper must submit to /api/soul-audit/submit')
}

const soulAuditDirectSubmit = soulAuditPage.includes('/api/soul-audit/submit')
const soulAuditHelperSubmit = soulAuditPage.includes('submitSoulAuditResponse(')
const soulAuditHookSubmit = soulAuditPage.includes('useSoulAuditSubmit')
if (!soulAuditDirectSubmit && !soulAuditHelperSubmit && !soulAuditHookSubmit) {
  fail('src/app/soul-audit/page.tsx must submit to /api/soul-audit/submit')
}
if ((soulAuditHelperSubmit || soulAuditHookSubmit) && !helperTargetsSubmitRoute) {
  fail('submit helper must submit to /api/soul-audit/submit')
}

console.log('[production-contracts] OK')
