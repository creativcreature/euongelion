#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const DECISIONS_FILE = path.join(ROOT, 'docs', 'production-decisions.yaml')
const INDEX_FILE = path.join(ROOT, 'docs', 'feature-prds', 'FEATURE-PRD-INDEX.md')
const REGISTRY_FILE = path.join(
  ROOT,
  'docs',
  'feature-prds',
  'FEATURE-PRD-REGISTRY.yaml',
)
const SCORECARD_FILE = path.join(ROOT, 'docs', 'PRODUCTION-FEATURE-SCORECARD.md')

const DEFAULT_SCORECARD_TOKENS = [
  'Founder scoring authority is capped at **5/10** baseline until founder elevation.',
  'Engineering implementation scores may exceed 5 with evidence.',
]

const DEFAULT_NON_WAKEUP_SHELL_FILES = [
  'src/app/settings/page.tsx',
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/offline/page.tsx',
  'src/app/loading.tsx',
  'src/app/error.tsx',
  'src/app/not-found.tsx',
  'src/components/AdminShell.tsx',
  'src/components/StaticInfoPage.tsx',
  'src/components/HelpHubPageClient.tsx',
]

function fail(message) {
  console.error(`\n[governance-alignment] ${message}\n`)
  process.exit(1)
}

function read(file) {
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

function parseIndexStatuses(markdown) {
  const result = new Map()
  const lines = markdown.split('\n')
  for (const line of lines) {
    if (!line.startsWith('| F-')) continue
    const columns = line.split('|').map((value) => value.trim())
    if (columns.length < 7) continue
    const id = columns[1]
    const status = columns[5]
    if (!/^F-\d{3}$/.test(id)) continue
    result.set(id, status)
  }
  return result
}

function parseRegistryStatuses(yaml) {
  const result = new Map()
  const lines = yaml.split('\n')
  let currentId = null

  for (const line of lines) {
    const trimmed = line.trim()
    const idMatch = trimmed.match(/^- id:\s*(F-\d{3})$/)
    if (idMatch) {
      currentId = idMatch[1]
      continue
    }

    if (currentId && trimmed.startsWith('status:')) {
      const status = trimmed.replace('status:', '').trim()
      result.set(currentId, status)
      currentId = null
    }
  }

  return result
}

function assertFeatureStatusParity(indexStatusMap, registryStatusMap) {
  const indexIds = new Set(indexStatusMap.keys())
  const registryIds = new Set(registryStatusMap.keys())

  for (const id of indexIds) {
    if (!registryIds.has(id)) {
      fail(`Feature ${id} is present in index but missing from registry`)
    }
  }
  for (const id of registryIds) {
    if (!indexIds.has(id)) {
      fail(`Feature ${id} is present in registry but missing from index`)
    }
  }

  const mismatches = []
  for (const id of indexIds) {
    const indexStatus = indexStatusMap.get(id)
    const registryStatus = registryStatusMap.get(id)
    if (indexStatus !== registryStatus) {
      mismatches.push(`${id}: index=${indexStatus}, registry=${registryStatus}`)
    }
  }

  if (mismatches.length > 0) {
    fail(
      `Status mismatch between index and registry:\n${mismatches
        .slice(0, 10)
        .map((line) => `- ${line}`)
        .join('\n')}`,
    )
  }
}

function assertScorecardPolicy(scorecard, requiredTokens) {
  for (const token of requiredTokens) {
    if (!scorecard.includes(token)) {
      fail(`Scorecard policy token missing: "${token}"`)
    }
  }
}

function assertShellParity(decisionsYaml) {
  const requiredFiles =
    parseSectionList(decisionsYaml, 'non_wakeup_shell_required_files') ||
    DEFAULT_NON_WAKEUP_SHELL_FILES
  const requiredTokens =
    parseSectionList(decisionsYaml, 'non_wakeup_shell_required_tokens').length >
    0
      ? parseSectionList(decisionsYaml, 'non_wakeup_shell_required_tokens')
      : ['mock-home', 'mock-paper']
  const forbiddenTokens =
    parseSectionList(decisionsYaml, 'non_wakeup_shell_forbidden_tokens').length >
    0
      ? parseSectionList(decisionsYaml, 'non_wakeup_shell_forbidden_tokens')
      : ['newspaper-home']

  const filesToCheck = requiredFiles.length
    ? requiredFiles
    : DEFAULT_NON_WAKEUP_SHELL_FILES

  for (const rel of filesToCheck) {
    const abs = path.join(ROOT, rel)
    const content = read(abs)
    for (const token of requiredTokens) {
      if (!content.includes(token)) {
        fail(`${rel} must contain shell token "${token}"`)
      }
    }
    for (const token of forbiddenTokens) {
      if (content.includes(token)) {
        fail(`${rel} must not contain forbidden shell token "${token}"`)
      }
    }
  }
}

const decisionsYaml = read(DECISIONS_FILE)
const index = read(INDEX_FILE)
const registry = read(REGISTRY_FILE)
const scorecard = read(SCORECARD_FILE)

assertFeatureStatusParity(parseIndexStatuses(index), parseRegistryStatuses(registry))

const scorecardTokens = parseSectionList(decisionsYaml, 'scorecard_required_tokens')
assertScorecardPolicy(
  scorecard,
  scorecardTokens.length ? scorecardTokens : DEFAULT_SCORECARD_TOKENS,
)

assertShellParity(decisionsYaml)

console.log('[governance-alignment] OK')
