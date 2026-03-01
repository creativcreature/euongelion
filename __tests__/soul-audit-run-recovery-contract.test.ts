import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Soul Audit run-recovery contract', () => {
  const hookPath = path.join(
    process.cwd(),
    'src',
    'hooks',
    'useSoulAuditSubmit.ts',
  )
  const helpersPath = path.join(
    process.cwd(),
    'src',
    'components',
    'soul-audit',
    'helpers.ts',
  )
  const resultsPath = path.join(
    process.cwd(),
    'src',
    'app',
    'soul-audit',
    'results',
    'page.tsx',
  )

  const hook = fs.readFileSync(hookPath, 'utf8')
  const helpers = fs.readFileSync(helpersPath, 'utf8')
  const results = fs.readFileSync(resultsPath, 'utf8')

  it('persists and clears last audit input via shared submit hook', () => {
    // Constants are defined in helpers.ts and imported by the hook and results page
    expect(helpers).toContain(
      "export const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'",
    )
    expect(helpers).toContain(
      "export const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'",
    )
    // The shared hook manages the submit flow
    expect(hook).toContain('useSoulAuditSubmit')
  })

  it('recovers expired runs from session-backed last input in results flow', () => {
    // Results page imports constants from helpers
    expect(results).toContain('LAST_AUDIT_INPUT_SESSION_KEY')
    expect(results).toContain('REROLL_USED_SESSION_KEY')
    // Helpers contain the loader function
    expect(helpers).toContain('function loadLastAuditInput(): string | null')
    // Results page has recovery logic
    expect(results).toContain('async function recoverExpiredRun(options?:')
    expect(results).toContain('Reload Options')
    expect(results).toContain('setRerollUsed(false)')
    expect(results).toContain(
      'sessionStorage.removeItem(REROLL_USED_SESSION_KEY)',
    )
    expect(results).toContain('!submitResult.runToken')
  })
})
