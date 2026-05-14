#!/usr/bin/env tsx
/**
 * R35: auto-author one pull-quote module per NON-substack devotional.
 *
 * For each devotional JSON in public/devotionals/<slug>.json that
 * is NOT in SUBSTACK_SOURCES:
 *   1. Find the first `teaching` / `insight` / `reflection` /
 *      `recap` / `bridge` module whose `content` field has a punchy
 *      single sentence (50–200 chars, ends with `.` `?` or `!`).
 *   2. Pick the most impactful-looking sentence by simple heuristics:
 *      prefer sentences with proper-noun capitals or em-dashes; avoid
 *      questions and meta-language.
 *   3. Inject a new `{ type: 'pullquote', quote }` module immediately
 *      after the source module. Skip if a pullquote is already there.
 *   4. Preserve the original modules + ordering (founder rule).
 *
 * Idempotent: re-running detects existing pullquote modules and
 * skips them.
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO = process.cwd()
const DEVOTIONAL_DIR = path.join(REPO, 'public', 'devotionals')
const SUBSTACK_TS = path.join(REPO, 'src', 'data', 'substack-sources.ts')

function loadSubstackSlugs(): Set<string> {
  const txt = fs.readFileSync(SUBSTACK_TS, 'utf-8')
  const slugs = new Set<string>()
  const re = /^\s+['"]([a-z][a-z0-9-]+)['"]:\s*\{/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(txt)) !== null) slugs.add(m[1])
  return slugs
}

function pickSentence(content: string): string | null {
  if (typeof content !== 'string') return null
  // Split on sentence boundaries
  const sentences = content
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 50 && s.length <= 220)
  if (sentences.length === 0) return null
  // Score: prefer sentences with proper nouns, avoid questions/meta
  const scored = sentences.map((s, idx) => {
    let score = 0
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(s)) score += 2 // proper-noun pair
    if (/—|–/.test(s)) score += 1
    if (/\?$/.test(s)) score -= 3 // questions are bad pull-quotes
    if (/^(in|this|here|that|as)\b/i.test(s)) score -= 1 // weak openers
    if (s.length > 90 && s.length < 180) score += 1 // sweet spot
    if (idx === 0 || idx === sentences.length - 1) score += 0.5 // opener/closer often punchy
    return { s, score, idx }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0].s
}

interface RawModule {
  type?: string
  order?: number
  content?: string | Record<string, unknown>
  data?: Record<string, unknown>
  [key: string]: unknown
}

interface Devotional {
  modules?: RawModule[]
  [key: string]: unknown
}

function findInjectableIndex(modules: RawModule[]): {
  afterIdx: number
  quote: string
} | null {
  const eligibleTypes = new Set([
    'teaching',
    'insight',
    'reflection',
    'recap',
    'bridge',
    'story',
  ])
  for (let i = 0; i < modules.length; i += 1) {
    const m = modules[i]
    if (!m || typeof m !== 'object') continue
    if (m.type === 'pullquote') return null // already has one
    if (!m.type || !eligibleTypes.has(m.type)) continue
    // Flatten content if nested
    let content: string | null = null
    if (typeof m.content === 'string') content = m.content
    else if (
      m.content &&
      typeof m.content === 'object' &&
      typeof (m.content as { content?: string }).content === 'string'
    )
      content = (m.content as { content: string }).content
    else if (
      m.content &&
      typeof m.content === 'object' &&
      typeof (m.content as { body?: string }).body === 'string'
    )
      content = (m.content as { body: string }).body
    else if (typeof (m as { content?: string }).content === 'string')
      content = (m as { content: string }).content
    if (!content || content.length < 200) continue
    const quote = pickSentence(content)
    if (quote) return { afterIdx: i, quote }
  }
  return null
}

function processFile(filePath: string, substackSlugs: Set<string>): boolean {
  const slug = path.basename(filePath, '.json')
  if (substackSlugs.has(slug)) return false

  const raw = fs.readFileSync(filePath, 'utf-8')
  let data: Devotional
  try {
    data = JSON.parse(raw)
  } catch {
    return false
  }
  if (!Array.isArray(data.modules) || data.modules.length === 0) return false
  // Already has a pullquote module?
  if (data.modules.some((m) => m && m.type === 'pullquote')) return false
  const target = findInjectableIndex(data.modules)
  if (!target) return false
  // Inject immediately after target
  const newMod: RawModule = { type: 'pullquote', quote: target.quote }
  const next = [
    ...data.modules.slice(0, target.afterIdx + 1),
    newMod,
    ...data.modules.slice(target.afterIdx + 1),
  ]
  data.modules = next
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  return true
}

function main() {
  const substackSlugs = loadSubstackSlugs()
  const files = fs
    .readdirSync(DEVOTIONAL_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(DEVOTIONAL_DIR, f))
  let touched = 0
  let skippedSubstack = 0
  for (const f of files) {
    const slug = path.basename(f, '.json')
    if (substackSlugs.has(slug)) {
      skippedSubstack += 1
      continue
    }
    if (processFile(f, substackSlugs)) touched += 1
  }
  console.log(
    `Processed ${files.length} files. Injected pullquotes on ${touched} non-substack devotionals. Skipped ${skippedSubstack} substack devotionals.`,
  )
}

main()
