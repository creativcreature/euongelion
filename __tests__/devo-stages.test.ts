import { describe, it, expect, beforeEach } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

let run: string
const sh = (script: string) =>
  execFileSync('sh', [
    '-c',
    `. scripts/devo-weekly/lib/stages.sh; ${script}`,
  ]).toString()

beforeEach(() => {
  run = mkdtempSync(join(tmpdir(), 'devorun-'))
})

describe('stage checkpointing', () => {
  it('runs a stage that has not completed', () => {
    expect(sh(`run_stage ${run} compose echo SPENT`)).toContain('SPENT')
  })

  it('skips a stage that already completed', () => {
    sh(`mark_stage ${run} compose`)
    const out = sh(`run_stage ${run} compose echo SPENT`)
    expect(out).not.toContain('SPENT')
    expect(out).toContain('skip')
  })

  it('does not mark a stage that failed', () => {
    try {
      sh(`run_stage ${run} compose false`)
    } catch {
      /* expected */
    }
    expect(existsSync(join(run, 'stages', 'compose.done'))).toBe(false)
  })

  it('reports the tier it ran under', () => {
    expect(sh(`CLAUDE_TIER=2 run_stage ${run} compose echo hi`)).toContain(
      'tier 2',
    )
  })
})
