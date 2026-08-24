import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function classify(exitCode: number, output: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'tier-'))
  const f = join(dir, 'out.txt')
  writeFileSync(f, output)
  return execFileSync('sh', [
    '-c',
    `. scripts/lib/claude-tier.sh; classify_tier_output ${exitCode} ${f}`,
  ])
    .toString()
    .trim()
}

describe('classify_tier_output', () => {
  it('treats exit 0 as healthy', () => {
    expect(classify(0, 'ok')).toBe('healthy')
  })

  it('detects an invalid or expired token', () => {
    // verbatim from scripts/lib/fixtures/tier-expired.txt
    expect(
      classify(
        1,
        'Failed to authenticate. API Error: 401 OAuth access token is invalid.',
      ),
    ).toBe('invalid')
    expect(classify(1, 'OAuth token has expired')).toBe('invalid')
    expect(classify(1, 'Invalid API key · Please run /login')).toBe('invalid')
  })

  it('detects an exhausted subscription', () => {
    expect(classify(1, 'Claude AI usage limit reached|1234567890')).toBe(
      'exhausted',
    )
    expect(classify(1, '5-hour limit reached ∙ resets at 3pm')).toBe(
      'exhausted',
    )
  })

  it('fails safe: unrecognised non-zero output advances the tier', () => {
    expect(classify(1, 'some unexpected network burp')).toBe('exhausted')
  })
})
