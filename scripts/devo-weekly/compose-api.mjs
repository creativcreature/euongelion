/**
 * Tier-3 composition arm.
 *
 * Runs the SAME committed devo-go skill text through the Messages API when
 * both subscription tiers are exhausted. This file deliberately carries NO
 * authored guidance of its own: if a rule is needed, it belongs in
 * .claude/skills/devo-go/ where both runtimes read it. That is what keeps
 * the two paths from drifting.
 *
 * Capability differences are read from docs/run/TIER3-TOOL-SURFACE.md and
 * surfaced in the reading-gate artifact.
 *
 * See docs/superpowers/specs/2026-08-23-dual-account-failover-design.md
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SKILL_DIR = '.claude/skills/devo-go'
const BRIEF = 'scripts/devo-weekly/STANDING-BRIEF.md'
const SURFACE = 'docs/run/TIER3-TOOL-SURFACE.md'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export function buildSystemPrompt() {
  const parts = [readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')]
  const refDir = join(SKILL_DIR, 'references')
  for (const f of readdirSync(refDir).sort()) {
    if (f.endsWith('.md')) parts.push(readFileSync(join(refDir, f), 'utf8'))
  }
  parts.push(readFileSync(BRIEF, 'utf8'))
  return parts.join('\n\n---\n\n')
}

/** Rows in the tool-surface table whose "Reproducible?" cell is no. */
export function capabilityGaps() {
  return readFileSync(SURFACE, 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('|') && /\|\s*\*{0,2}no\*{0,2}\s*\|\s*$/i.test(l))
    .map((l) => l.split('|')[1].trim())
    .filter(Boolean)
}

export async function composeViaApi({ thematic, model, maxTokens = 16000 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('composeViaApi: ANTHROPIC_API_KEY is not set (tier 3 requires it)')
  }
  const gaps = capabilityGaps()
  const useModel = model ?? process.env.TIER3_MODEL ?? 'claude-sonnet-5'

  // Direct fetch, matching supabase/functions/generate-plan-day/brain-direct.ts:
  // honest errors, no silent fallback, no new dependency.
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: maxTokens,
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserPrompt(thematic, gaps) }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`composeViaApi: ${res.status} ${res.statusText} ${detail.slice(0, 400)}`)
  }

  const data = await res.json()
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  if (!text.trim()) throw new Error('composeViaApi: model returned no text')

  return { text, tier: 3, model: useModel, capabilityGaps: gaps, usage: data.usage }
}

export function buildUserPrompt(thematic, gaps) {
  return [
    "Execute devo-go for next week's series.",
    '',
    'THEMATIC:',
    thematic,
    '',
    'RUNTIME: tier 3 (API). These capabilities are unavailable to you:',
    ...gaps.map((g) => `- ${g}`),
    '',
    'Ground only in the committed reference index, lexicons and BSB corpus.',
    'Cut anything you cannot verify from those. Every other standard in the',
    'skill applies unchanged.',
  ].join('\n')
}
