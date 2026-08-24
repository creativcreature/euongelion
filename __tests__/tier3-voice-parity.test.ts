import { describe, it, expect } from 'vitest'
import {
  buildVoiceParityPrompt,
  scoreVoiceParity,
  EXEMPLAR_SERIES,
} from './soul-audit-evals/rubric'
import { existsSync } from 'node:fs'

const llmEnabled =
  process.env.RUN_SOULAUDIT_LLM_RUBRIC === '1' &&
  typeof process.env.ANTHROPIC_API_KEY === 'string' &&
  process.env.ANTHROPIC_API_KEY.trim().length > 0

describe('tier-3 voice parity — prompt and contract', () => {
  it('names committed exemplars that actually exist', () => {
    expect(EXEMPLAR_SERIES.length).toBeGreaterThanOrEqual(3)
    for (const p of EXEMPLAR_SERIES) expect(existsSync(p)).toBe(true)
  })

  it('asks only about voice, never about factual content', () => {
    const p = buildVoiceParityPrompt('candidate text', [
      'exemplar one',
      'exemplar two',
    ])
    expect(p).toMatch(/voice|cadence|register/i)
    // the BSB verbatim gate owns factual accuracy — this judge must not
    expect(p).not.toMatch(/factual|accurate|verify the scripture/i)
  })

  it('includes the candidate and every exemplar', () => {
    const p = buildVoiceParityPrompt('CANDIDATE_MARKER', ['EX_ONE', 'EX_TWO'])
    expect(p).toContain('CANDIDATE_MARKER')
    expect(p).toContain('EX_ONE')
    expect(p).toContain('EX_TWO')
  })

  it('skips gracefully — returns null — when the flag or key is absent', async () => {
    const saved = process.env.RUN_SOULAUDIT_LLM_RUBRIC
    delete process.env.RUN_SOULAUDIT_LLM_RUBRIC
    await expect(scoreVoiceParity('x', ['y'])).resolves.toBeNull()
    if (saved !== undefined) process.env.RUN_SOULAUDIT_LLM_RUBRIC = saved
  })
})

describe.skipIf(!llmEnabled)('tier-3 voice parity — live judge', () => {
  it('rejects obviously off-voice text', async () => {
    const r = await scoreVoiceParity(
      'Here are 5 actionable tips to optimize your faith journey! #blessed',
      ['A quiet meditation on waiting, and what the waiting does to a person.'],
    )
    expect(r?.pass).toBe(false)
  })
})
