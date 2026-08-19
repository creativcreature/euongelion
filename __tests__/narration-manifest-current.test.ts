/**
 * Every shipped track must say what its page says.
 *
 * `render_kokoro.py` stores a fingerprint of the text it spoke (`textHash`)
 * with each entry it publishes. That fingerprint is a SHA-1 over the extracted
 * segments joined by newlines — and because `src/lib/audio/segments.ts` and
 * `narration_extract.py` are held at exact parity by
 * `narration-reading-contract.test.ts`, the reader can recompute it here
 * without running Python.
 *
 * A mismatch means the devotional was edited (or the reading contract changed)
 * after its audio was rendered: the recording is missing words the page shows,
 * and every chapter mark after the edit points at the wrong second. The fix is
 * always the same — re-run `render_catalog.py`, which now re-renders exactly
 * the tracks this test names, then `build_chapters.py`.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { buildModuleSegments, buildPanelSegments } from '@/lib/audio/segments'
import manifest from '@/data/audio-manifest.json'

const DIR = path.join(process.cwd(), 'public/devotionals')
const AUDIO = path.join(process.cwd(), 'public/audio')

type Entry = {
  src: string
  duration: number
  words: number
  textHash?: string | null
  chapters?: Array<{ t: number; label: string; module: number }>
}
const tracks = manifest as unknown as Record<string, Entry>

function spokenHash(slug: string): string | null {
  const file = path.join(DIR, `${slug}.json`)
  if (!fs.existsSync(file)) return null
  const dev = JSON.parse(fs.readFileSync(file, 'utf8'))
  // Panels-format days render through the same pipeline since SA-092 — the
  // Python extractor mirrors buildPanelSegments byte-for-byte, and this
  // recomputation is the gate that keeps them identical.
  const segments = Array.isArray(dev.modules)
    ? buildModuleSegments(dev.title ?? '', dev.modules, dev.subtitle)
    : Array.isArray(dev.panels)
      ? buildPanelSegments(dev.title ?? '', dev.panels, dev.subtitle)
      : null
  if (segments === null) return null
  const joined = segments.map((s) => s.text).join('\n')
  return crypto
    .createHash('sha1')
    .update(joined, 'utf8')
    .digest('hex')
    .slice(0, 12)
}

describe('narration manifest is current', () => {
  it('lists a track for every devotional that has modules', () => {
    const missing = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith('.json'))
      .filter((f) => {
        const dev = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
        return Array.isArray(dev.modules) && dev.modules.length > 0
      })
      .map((f) => f.replace(/\.json$/, ''))
      .filter((slug) => !tracks[slug])
    expect(missing).toEqual([])
  })

  it('every track was rendered from the text the page now shows', () => {
    const stale: string[] = []
    for (const [slug, entry] of Object.entries(tracks)) {
      const want = spokenHash(slug)
      if (entry.textHash !== want) {
        stale.push(
          `${slug} (rendered ${entry.textHash ?? 'pre-hash'}, page ${want})`,
        )
      }
    }
    expect(stale).toEqual([])
  })

  it('every track points at a content-versioned key on the audio route', () => {
    // Audio is served from R2 through src/app/audio/[file]/route.ts (SA-098),
    // which does real byte ranges and falls back observably. Keys carry a
    // content hash so its immutable cache can never serve stale bytes.
    const bad = Object.entries(tracks)
      .filter(
        ([slug, e]) =>
          !e.src.startsWith('/audio/') ||
          !new RegExp(`/${slug}-[0-9a-f]{10}\\.m4a$`).test(e.src),
      )
      .map(([slug]) => slug)
    expect(bad).toEqual([])
  })

  it('every track carries chapters that stay inside its runtime', () => {
    const bad: string[] = []
    for (const [slug, entry] of Object.entries(tracks)) {
      const chs = entry.chapters
      if (!chs || chs.length === 0) {
        bad.push(`${slug}: no chapters`)
        continue
      }
      if (chs[0].t !== 0)
        bad.push(`${slug}: first chapter at ${chs[0].t}s, not 0`)
      if (chs[chs.length - 1].t > entry.duration) {
        bad.push(
          `${slug}: last chapter ${chs[chs.length - 1].t}s > ${entry.duration}s`,
        )
      }
      for (let i = 1; i < chs.length; i++) {
        if (chs[i].t <= chs[i - 1].t) {
          bad.push(`${slug}: chapter ${i} does not advance (${chs[i].t}s)`)
          break
        }
      }
    }
    expect(bad).toEqual([])
  })
})
