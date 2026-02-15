import { describe, expect, it } from 'vitest'
import { buildAuditOptions } from '@/lib/soul-audit/matching'

describe('Soul Audit option specificity', () => {
  it('anchors AI option copy to user language while keeping scripture-first previews', () => {
    const input =
      'My rent is overdue, parenting exhaustion is crushing me, and layoff anxiety keeps me awake.'

    const options = buildAuditOptions(input).filter(
      (option) => option.kind === 'ai_primary',
    )
    expect(options.length).toBe(3)

    const copy = options
      .map((option) =>
        `${option.title} ${option.question} ${option.preview?.paragraph ?? ''}`.toLowerCase(),
      )
      .join(' ')

    expect(copy).toMatch(
      /(rent|overdue|parenting|exhaustion|layoff|anxiety|awake)/,
    )

    expect(
      options.every(
        (option) => (option.preview?.verse ?? '').trim().length > 0,
      ),
    ).toBe(true)
  })
})
