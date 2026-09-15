// @vitest-environment node
/**
 * Plan §32 (SA-142 / F-184): regression tests for the causes actually found
 * behind "the comic doesn't load" and "the comic is wrong". Each test names the
 * cause it pins. The trace and the checks that found nothing wrong are
 * recorded in docs/daily-bread/DAILY-BREAD-V2.md §6.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createClaudeCliProvider } from '@/lib/daily-bread/providers/claude-cli'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('comic root causes (plan §32)', () => {
  it('cause 1: daily-gapfill installs the Claude CLI before the tier probe (it exited 0 having filled nothing)', () => {
    const yml = read('.github/workflows/daily-gapfill.yml')
    const install = yml.indexOf('npm install -g @anthropic-ai/claude-code')
    const probe = yml.indexOf('if ! select_tier')
    expect(install).toBeGreaterThan(-1)
    expect(probe).toBeGreaterThan(install)
  })

  it('cause 2: daily-edition has time to reach its last step, the strips (15 minutes killed it first)', () => {
    const yml = read('.github/workflows/daily-edition.yml')
    const minutes = Number(/build-edition:[\s\S]*?timeout-minutes:\s*(\d+)/.exec(yml)?.[1])
    expect(minutes).toBeGreaterThanOrEqual(150)
  })

  it('cause 3: a tier-3 run (API key only, no OAuth token) can still compose — the Sunday lead threw and skipped the strips', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'db2-tier3-'))
    const bin = path.join(dir, 'claude')
    fs.writeFileSync(bin, '#!/bin/sh\necho 1.0.0\n')
    fs.chmodSync(bin, 0o755)
    expect(createClaudeCliProvider({ env: { ANTHROPIC_API_KEY: 'sk-ant-tier3' }, bin }).available()).toBe(true)
    // And the workflow calls the interface command, not the removed script that required the token.
    expect(read('.github/workflows/daily-edition.yml')).toContain('npm run daily-bread -- sunday-lead')
  })

  it('cause 4: failure alerts can file an issue (contents: read alone refused them, silently)', () => {
    for (const f of ['.github/workflows/daily-edition.yml', '.github/workflows/daily-gapfill.yml']) {
      expect(read(f), f).toMatch(/permissions:[\s\S]*?issues:\s*write/)
    }
  })

  it('cause 5: a strip file is never overwritten (No. 4 was written over the published No. 1’s echo-dust-004.jpg)', () => {
    const src = read('scripts/edition/strip/generate-strip.mjs')
    // The key carries the date and a run stamp, not the strip number.
    expect(src).toContain('const stem = `echo-dust-${date}-${Date.now().toString(36)}`')
    expect(src).toContain('const key = `strip/${stem}.jpg`')
    const upload = src.slice(src.indexOf('const key = `strip/${stem}.jpg`'), src.indexOf('if (!up.ok)'))
    expect(upload).toContain("'x-upsert': 'false'")
    expect(upload).not.toContain("'x-upsert': 'true'")
  })

  it('cause 6: --force never redraws an approved strip (the row upsert would turn a printed strip back into a draft)', () => {
    const src = read('scripts/edition/strip/generate-strip.mjs')
    const guard = src.indexOf("rows.some((row) => row.status === 'published')")
    const force = src.indexOf('if (rows.length > 0 && !args.force)')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(force)
  })
})
