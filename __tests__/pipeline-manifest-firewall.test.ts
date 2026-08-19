/**
 * Devo-pipeline Phase 0 — the manifest spine and the Part E firewall.
 *
 * The firewall is the reason the validator exists. `last30days` returns Reddit
 * posts, X threads and YouTube comments: excellent evidence about what readers
 * ASK and the words they use, and no evidence at all about God, Scripture or
 * history. devo-go's verification regime is the product's competitive advantage
 * in a category drowning in unverified AI output, and one laundered anecdote
 * would cost more than the entire discovery stage gains.
 *
 * Convention cannot hold that line across sessions and agents. These tests hold
 * it mechanically: a phrase recorded as audience language must never appear
 * verbatim in a devotional body, and a violation must be BLOCKING and
 * distinguishable from a mere schema error.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const REPO = process.cwd()
const DIR = path.join(REPO, 'content/pipeline')
const SLUG = '__fixture-pipeline-test'
const FILE = path.join(DIR, `${SLUG}.pipeline.json`)
const DEVO = path.join(REPO, 'public/devotionals', `${SLUG}-day-1.json`)

const EXIT_SCHEMA = 1
const EXIT_FIREWALL = 2

function manifest(over: Record<string, unknown> = {}) {
  return {
    schema: 1,
    slug: SLUG,
    thematic: 'a fixture',
    mode: 'gated',
    rulings: { sa: 'SA-000', prd: 'F-000' },
    discovery: { audience_language: [], covered: false },
    stages: Object.fromEntries(
      ['text', 'audio', 'motion', 'social', 'package', 'publish'].map((s) => [
        s,
        { state: 'pending' },
      ]),
    ),
    policy: { c2pa_posture: 'unset' },
    ...over,
  }
}

/** Returns the validator's exit code, never throwing on non-zero. */
function run(): { code: number; out: string } {
  try {
    const out = execFileSync('node', ['scripts/validate-pipeline.mjs', SLUG], {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, out }
  } catch (e: any) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

function write(m: unknown) {
  fs.mkdirSync(DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(m, null, 2))
}

afterEach(() => {
  fs.rmSync(FILE, { force: true })
  fs.rmSync(DEVO, { force: true })
})

describe('pipeline manifest validation', () => {
  it('a well-formed manifest passes', () => {
    write(manifest())
    expect(run().code).toBe(0)
  })

  it('rejects an unknown stage state rather than letting the machine advance blindly', () => {
    const m = manifest() as any
    m.stages.text.state = 'almost'
    write(m)
    const r = run()
    expect(r.code).toBe(EXIT_SCHEMA)
    expect(r.out).toContain('stages.text.state')
  })

  it('rejects a manifest whose filename disagrees with its slug — resume finds it by filename', () => {
    write(manifest({ slug: 'something-else' }))
    expect(run().code).toBe(EXIT_SCHEMA)
  })

  it('requires the SA/PRD rulings, so a run cannot be unattributable', () => {
    const m = manifest() as any
    delete m.rulings
    write(m)
    expect(run().code).toBe(EXIT_SCHEMA)
  })
})

describe('Part E firewall', () => {
  const PHRASE =
    'people keep asking whether this passage means what they fear it means'

  it('BLOCKS when audience language reaches a devotional body', () => {
    fs.writeFileSync(
      DEVO,
      JSON.stringify({
        day: 1,
        title: 'x',
        modules: [
          { type: 'teaching', body: `Some prose. ${PHRASE}. More prose.` },
        ],
      }),
    )
    write(
      manifest({
        discovery: {
          audience_language: [{ phrase: PHRASE, source: 'r/Christianity' }],
          covered: false,
        },
      }),
    )
    const r = run()
    expect(r.code).toBe(EXIT_FIREWALL)
    expect(r.out).toContain('FIREWALL VIOLATION')
    expect(r.out).toContain(PHRASE)
  })

  it('a firewall violation is distinguishable from a schema error', () => {
    fs.writeFileSync(DEVO, JSON.stringify({ modules: [{ body: PHRASE }] }))
    write(
      manifest({
        discovery: { audience_language: [{ phrase: PHRASE }], covered: false },
      }),
    )
    expect(run().code).not.toBe(EXIT_SCHEMA)
  })

  it('allows the same phrase when it has NOT been lifted into the corpus', () => {
    fs.writeFileSync(
      DEVO,
      JSON.stringify({
        modules: [{ body: 'Entirely unrelated devotional prose.' }],
      }),
    )
    write(
      manifest({
        discovery: { audience_language: [{ phrase: PHRASE }], covered: false },
      }),
    )
    expect(run().code).toBe(0)
  })

  it('ignores short phrases, which collide by coincidence rather than by lifting', () => {
    fs.writeFileSync(
      DEVO,
      JSON.stringify({ modules: [{ body: 'He is faithful and true.' }] }),
    )
    write(
      manifest({
        discovery: { audience_language: [{ phrase: 'he is' }], covered: false },
      }),
    )
    expect(run().code).toBe(0)
  })

  it('matches through punctuation and casing, so reformatting is not an escape hatch', () => {
    fs.writeFileSync(
      DEVO,
      JSON.stringify({
        modules: [
          {
            body: 'People KEEP asking — whether this passage means, what they fear it means!',
          },
        ],
      }),
    )
    write(
      manifest({
        discovery: { audience_language: [{ phrase: PHRASE }], covered: false },
      }),
    )
    expect(run().code).toBe(EXIT_FIREWALL)
  })
})
