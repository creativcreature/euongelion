import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  buildSystemPrompt,
  capabilityGaps,
} from '../scripts/devo-weekly/compose-api.mjs'

describe('tier-3 composition arm', () => {
  it('builds its system prompt from the committed skill text', () => {
    const prompt = buildSystemPrompt()
    const skill = readFileSync('.claude/skills/devo-go/SKILL.md', 'utf8')
    expect(prompt).toContain(skill.trim().slice(0, 200))
  })

  it('includes every devo-go reference file', () => {
    const prompt = buildSystemPrompt()
    for (const f of [
      'workflow',
      'verification-standards',
      'imagery-and-video',
      'traps',
      'narration',
    ]) {
      const ref = readFileSync(
        `.claude/skills/devo-go/references/${f}.md`,
        'utf8',
      )
      expect(prompt).toContain(ref.trim().slice(0, 120))
    }
  })

  it('includes the founder standing brief', () => {
    const brief = readFileSync('scripts/devo-weekly/STANDING-BRIEF.md', 'utf8')
    expect(buildSystemPrompt()).toContain(brief.trim().slice(0, 120))
  })

  it('carries no authored voice guidance of its own', () => {
    const src = readFileSync('scripts/devo-weekly/compose-api.mjs', 'utf8')
    const body = src.replace(/^[\s\S]*?\*\//, '') // strip the header comment
    expect(body).not.toMatch(
      /pastoral|devotional voice|tone should|write warmly/i,
    )
  })

  it('reports the capability gaps from the committed enumeration', () => {
    const gaps = capabilityGaps()
    expect(gaps.join(' ')).toMatch(/WebSearch/)
  })
})
