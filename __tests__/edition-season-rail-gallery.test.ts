import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, describe, expect, it } from 'vitest'

import { validateEditionItem } from '@/lib/edition/kinds'
import { generateSeason } from '@/lib/edition/generators/season'
import { generateRail } from '@/lib/edition/generators/rail'
import {
  generateGallery,
  titleFromFile,
  THEME_SUFFIX_TOKENS,
} from '@/lib/edition/generators/gallery'

// The three deterministic generators of The Daily Bread (SA-090 / F-136).
//
// The contract these prove is the whole point of the engine: an edition is a
// pure function of its UTC date. Same day in, same paper out — no
// Math.random, no clock reads, no network — and every asset a generator
// points at actually exists on disk, because a rail brief with a dead
// thumbnail is a broken front page.

const PUBLIC_DIR = join(process.cwd(), 'public')

interface AuditPrint {
  file: string
  artist: string
  verdict: string
}
const auditFile = JSON.parse(
  readFileSync(join(process.cwd(), 'docs/print-audit-2026-08-18.json'), 'utf8'),
) as { generatedAt: string; note: string; prints: AuditPrint[] }

const D = (iso: string) => new Date(`${iso}T00:00:00Z`)

const tempDirs: string[] = []
function tempAudit(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'edition-audit-'))
  tempDirs.push(dir)
  const file = join(dir, 'print-audit.json')
  writeFileSync(file, JSON.stringify(contents), 'utf8')
  return file
}

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

describe('deterministic generators', () => {
  it('produces byte-identical output three runs in a row', async () => {
    const date = D('2026-08-18')

    const seasons = await Promise.all([
      generateSeason(date),
      generateSeason(date),
      generateSeason(date),
    ])
    const rails = await Promise.all([
      generateRail(date),
      generateRail(date),
      generateRail(date),
    ])
    const galleries = await Promise.all([
      generateGallery(date),
      generateGallery(date),
      generateGallery(date),
    ])

    for (const runs of [seasons, rails, galleries]) {
      expect(JSON.stringify(runs[1])).toBe(JSON.stringify(runs[0]))
      expect(JSON.stringify(runs[2])).toBe(JSON.stringify(runs[0]))
    }
  })

  it('produces a different edition on a different day', async () => {
    const a = await generateRail(D('2026-08-18'))
    const b = await generateRail(D('2026-08-19'))
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('ignores the time of day — only the UTC date decides the edition', async () => {
    const morning = new Date('2026-08-18T00:00:01Z')
    const night = new Date('2026-08-18T23:59:59Z')

    expect(JSON.stringify(await generateSeason(night))).toBe(
      JSON.stringify(await generateSeason(morning)),
    )
    expect(JSON.stringify(await generateRail(night))).toBe(
      JSON.stringify(await generateRail(morning)),
    )
    expect(JSON.stringify(await generateGallery(night))).toBe(
      JSON.stringify(await generateGallery(morning)),
    )
  })
})

describe('generateSeason', () => {
  // One date inside every season `liturgicalDay` can return. If a season is
  // ever added to the calendar without a note, one of these fails.
  const SEASON_DATES: Array<[string, string, string]> = [
    ['advent', '2026-12-05', 'Advent'],
    ['christmas', '2026-12-26', 'Christmas'],
    ['epiphany', '2026-01-10', 'Epiphany'],
    ['lent', '2026-03-10', 'Lent'],
    ['holy-week', '2026-03-31', 'Holy Week'],
    ['easter', '2026-04-25', 'Easter'],
    ['pentecost', '2026-05-24', 'Pentecost'],
    ['ordinary', '2026-07-15', 'Ordinary Time'],
  ]

  it.each(SEASON_DATES)(
    'writes a real note for %s (%s)',
    async (_season, iso, expectedLabel) => {
      const [item] = await generateSeason(D(iso))

      expect(item.kind).toBe('season')
      expect(item.slot).toBe(0)
      expect(item.status).toBe('approved')
      expect(item.publishDate).toBe(iso)
      expect(item.payload.seasonLabel).toBe(expectedLabel)
      expect(item.payload.note.trim().length).toBeGreaterThan(40)
      expect(validateEditionItem(item)).toBeNull()
    },
  )

  it('returns exactly one item and carries the feast when the date has one', async () => {
    const items = await generateSeason(D('2026-12-26'))
    expect(items).toHaveLength(1)
    expect(items[0].payload.feast).toBe('Stephen, First Martyr')
    expect(items[0].payload.dayLabel).toBe('Christmas Season')
  })

  it('every season note is distinct — no season borrows another season’s line', async () => {
    const notes = await Promise.all(
      SEASON_DATES.map(
        async ([, iso]) => (await generateSeason(D(iso)))[0].payload.note,
      ),
    )
    expect(new Set(notes).size).toBe(SEASON_DATES.length)
  })
})

describe('generateRail', () => {
  const DATES = ['2026-01-01', '2026-04-05', '2026-08-18', '2026-12-31']

  it('runs three briefs in slots 0, 1, 2', async () => {
    const items = await generateRail(D('2026-08-18'))
    expect(items).toHaveLength(3)
    expect(items.map((i) => i.slot)).toEqual([0, 1, 2])
    expect(items.every((i) => i.kind === 'rail')).toBe(true)
    expect(items.every((i) => i.status === 'approved')).toBe(true)
    expect(items.every((i) => i.publishDate === '2026-08-18')).toBe(true)
  })

  it.each(DATES)('picks three distinct series on %s', async (iso) => {
    const items = await generateRail(D(iso))
    const slugs = items.map((i) => i.payload.slug)
    expect(new Set(slugs).size).toBe(3)
  })

  it.each(DATES)(
    'points every brief at a thumbnail that exists on disk (%s)',
    async (iso) => {
      const items = await generateRail(D(iso))
      for (const item of items) {
        expect(item.payload.image.startsWith('/')).toBe(true)
        expect(existsSync(join(PUBLIC_DIR, item.payload.image))).toBe(true)
      }
    },
  )

  it('gives every brief a title and a kicker, and passes the contract guard', async () => {
    // A year of editions: every series the rotation can reach must be
    // publishable, not just the handful today's modulo happens to land on.
    for (let day = 0; day < 366; day++) {
      const date = new Date(Date.UTC(2026, 0, 1 + day))
      for (const item of await generateRail(date)) {
        expect(item.payload.title.length).toBeGreaterThan(0)
        expect(item.payload.kicker.length).toBeGreaterThan(0)
        expect(validateEditionItem(item)).toBeNull()
      }
    }
  })
})

describe('generateGallery', () => {
  it('returns one approved item that passes the contract guard', async () => {
    const items = await generateGallery(D('2026-08-18'))
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('gallery')
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('approved')
    expect(items[0].publishDate).toBe('2026-08-18')
    expect(validateEditionItem(items[0])).toBeNull()
  })

  it('only ever prints a print the audit marked clean', async () => {
    const clean = new Set(
      auditFile.prints.filter((p) => p.verdict === 'clean').map((p) => p.file),
    )
    const notClean = new Set(
      auditFile.prints.filter((p) => p.verdict !== 'clean').map((p) => p.file),
    )
    expect(clean.size).toBeGreaterThan(0)

    for (let day = 0; day < 366; day++) {
      const [item] = await generateGallery(new Date(Date.UTC(2026, 0, 1 + day)))
      const file = item.payload.image.replace('/images/devotional-prints/', '')
      expect(clean.has(file)).toBe(true)
      expect(notClean.has(file)).toBe(false)
      expect(item.payload.auditVerdict).toBe('clean')
    }
  })

  it('points at an image file that exists, with the audited artist', async () => {
    for (const iso of [
      '2026-01-01',
      '2026-06-06',
      '2026-08-18',
      '2026-12-31',
    ]) {
      const [item] = await generateGallery(D(iso))
      expect(existsSync(join(PUBLIC_DIR, item.payload.image))).toBe(true)

      const file = item.payload.image.replace('/images/devotional-prints/', '')
      const record = auditFile.prints.find((p) => p.file === file)
      expect(record).toBeDefined()
      expect(item.payload.artist).toBe(record!.artist)
      expect(item.payload.title.length).toBeGreaterThan(0)
      expect(item.payload.looking.length).toBeGreaterThan(80)
    }
  })

  it('rotates through the whole clean pool over a year rather than repeating one print', async () => {
    const seen = new Set<string>()
    for (let day = 0; day < 366; day++) {
      const [item] = await generateGallery(new Date(Date.UTC(2026, 0, 1 + day)))
      seen.add(item.payload.image)
    }
    // 2026 has 365 days, so a pool larger than that cannot be exhausted.
    const cleanCount = auditFile.prints.filter(
      (p) => p.verdict === 'clean',
    ).length
    expect(seen.size).toBe(Math.min(cleanCount, 365))
  })

  it('varies the looking paragraph across dates without ever inventing one', async () => {
    const looks = new Set<string>()
    for (let day = 0; day < 60; day++) {
      const [item] = await generateGallery(new Date(Date.UTC(2026, 0, 1 + day)))
      looks.add(item.payload.looking)
    }
    expect(looks.size).toBeGreaterThan(1)
  })

  it('drops the artist token and title-cases the rest of the filename', () => {
    expect(titleFromFile('rembrandt-return-of-the-prodigal.webp')).toBe(
      'Return of the Prodigal',
    )
    expect(titleFromFile('arch-ancient-olive-press.webp')).toBe(
      'Ancient Olive Press',
    )
  })

  it('strips the devotional-theme suffix so a print keeps the title it actually has', () => {
    // Each of these has a base twin in the audit: the same picture, filed once
    // under its own name and once under the devotional it illustrated. Only
    // the first title is real, so both must produce it.
    expect(titleFromFile('millet-the-angelus.webp')).toBe('The Angelus')
    expect(titleFromFile('millet-angelus-rooted.webp')).toBe('Angelus')
    expect(titleFromFile('millet-angelus-rhythm.webp')).toBe('Angelus')

    expect(titleFromFile('allston-elijah-desert.webp')).toBe('Elijah Desert')
    expect(titleFromFile('allston-elijah-desert-present.webp')).toBe(
      'Elijah Desert',
    )

    expect(titleFromFile('aivazovsky-ninth-wave-rooted.webp')).toBe(
      'Ninth Wave',
    )
    expect(titleFromFile('courbet-stone-breakers-valued.webp')).toBe(
      'Stone Breakers',
    )
    expect(titleFromFile('veronese-feast-cana-hunger.webp')).toBe('Feast Cana')
    // Two theme tokens in a row both come off.
    expect(titleFromFile('arch-gethsemane-end-ourselves.webp')).toBe(
      'Gethsemane',
    )
    // Stripping never empties the title: Ford Madox Brown's "Work" and
    // Chardin's "Grace" are the last word standing and survive as themselves.
    expect(titleFromFile('brown-work-shared.webp')).toBe('Work')
    expect(titleFromFile('brown-work.webp')).toBe('Work')
    expect(titleFromFile('chardin-grace-anointed.webp')).toBe('Grace')
  })

  it('never strips a theme word that is part of the real title', () => {
    // Ge's picture IS "What Is Truth?" — a title may not be left on 'What Is'.
    expect(titleFromFile('ge-what-is-truth.webp')).toBe('What Is Truth')
    // 'cross' only trails as a theme; mid-filename it is the subject.
    expect(titleFromFile('rembrandt-christ-cross-etching.webp')).toBe(
      'Christ Cross Etching',
    )
  })

  it('every published title is filename words only, and never ends on a theme token', async () => {
    // The two halves of the fabrication guard: a title may LOSE filename
    // words, but it may never gain one, and it may never keep the devotional
    // theme that got appended to the file.
    //
    // The two documented exemptions stay exempt: a theme token that is the
    // last word standing ("Work", "Grace") and one that a connective needs
    // ("What Is Truth").
    const CONNECTIVES = new Set([
      'a',
      'an',
      'and',
      'at',
      'by',
      'for',
      'from',
      'in',
      'is',
      'of',
      'on',
      'or',
      'the',
      'to',
      'with',
    ])

    for (let day = 0; day < 366; day++) {
      const [item] = await generateGallery(new Date(Date.UTC(2026, 0, 1 + day)))
      const file = item.payload.image.replace('/images/devotional-prints/', '')
      const fileWords = new Set(file.replace(/\.webp$/, '').split('-'))
      const titleWords = item.payload.title.toLowerCase().split(' ')

      for (const word of titleWords) {
        expect(fileWords.has(word)).toBe(true)
      }

      const strippable =
        titleWords.length > 1 &&
        !CONNECTIVES.has(titleWords[titleWords.length - 2])
      if (strippable) {
        expect(THEME_SUFFIX_TOKENS.has(titleWords[titleWords.length - 1])).toBe(
          false,
        )
      }
    }
  })

  it('never says anything about paint, figures or colour — the pool is not all paintings', async () => {
    // Architecture, mosaics, sculpture and artifacts share this section with
    // the canvases. A looking paragraph about hands, under a photograph of an
    // olive press, is an invention.
    const FORBIDDEN =
      /\b(paint|paints|painted|painter|painters|painting|paintings|brush|brushwork|canvas|colour|colours|color|colors|figure|figures|face|faces|hand|hands|body|bodies|drapery|crowd|gaze|eyeline|eyelines)\b/i

    for (let day = 0; day < 366; day++) {
      const [item] = await generateGallery(new Date(Date.UTC(2026, 0, 1 + day)))
      expect(item.payload.looking).not.toMatch(FORBIDDEN)
    }
  })

  it('THROWS when the audit has no clean prints — never falls back to an unaudited one', async () => {
    const emptyPool = tempAudit({
      generatedAt: '2026-08-18T00:00:00.000Z',
      note: 'test fixture',
      prints: [
        {
          file: 'angelico-annunciation-believe.webp',
          artist: 'Angelico',
          verdict: 'text-artifact',
        },
        {
          file: 'rembrandt-abraham-isaac.webp',
          artist: 'Rembrandt',
          verdict: 'unreviewed',
        },
      ],
    })

    await expect(generateGallery(D('2026-08-18'), emptyPool)).rejects.toThrow(
      /clean/,
    )
  })

  it('THROWS on a malformed audit file rather than publishing nothing quietly', async () => {
    const malformed = tempAudit({ generatedAt: '2026-08-18T00:00:00.000Z' })
    await expect(generateGallery(D('2026-08-18'), malformed)).rejects.toThrow(
      /malformed print audit/,
    )
  })
})
