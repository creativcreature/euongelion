import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Soul Audit run-recovery contract', () => {
  const homePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
  const resultsPath = path.join(
    process.cwd(),
    'src',
    'app',
    'soul-audit',
    'results',
    'page.tsx',
  )

  const home = fs.readFileSync(homePath, 'utf8')
  const results = fs.readFileSync(resultsPath, 'utf8')

  it('persists and clears last audit input in homepage submit/reset flows', () => {
    expect(home).toContain(
      "const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'",
    )
    expect(home).toContain(
      "const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'",
    )
    expect(home).toContain(
      'sessionStorage.setItem(LAST_AUDIT_INPUT_SESSION_KEY, trimmed)',
    )
    expect(home).toContain(
      'sessionStorage.removeItem(LAST_AUDIT_INPUT_SESSION_KEY)',
    )
    expect(home).toContain('sessionStorage.removeItem(REROLL_USED_SESSION_KEY)')
  })

  it('recovers expired runs from session-backed last input in results flow', () => {
    expect(results).toContain(
      "const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'",
    )
    expect(results).toContain(
      "const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'",
    )
    expect(results).toContain('function loadLastAuditInput(): string | null')
    expect(results).toContain('async function recoverExpiredRun()')
    expect(results).toContain('Reload Options')
    expect(results).toContain('setRerollUsed(false)')
    expect(results).toContain(
      'sessionStorage.removeItem(REROLL_USED_SESSION_KEY)',
    )
    expect(results).toContain('!submitResult?.runToken')
    expect(results).toContain(
      'Run details expired and could not be verified. Please restart Soul Audit.',
    )
  })
})
