/**
 * Builds the Bible corpus consumed by `src/lib/bible/getVerse.ts`.
 *
 * Sources:
 *   - 6 of 7 translations are pulled from scrollmapper/bible_databases JSON
 *     mirrors (BSB, KJV, ASV, YLT, Darby, BBE).
 *   - WEB is pulled from ebible.org's verse-per-line distribution
 *     (eng-web_vpl.zip) because scrollmapper does not host WEB.
 *
 * Output:
 *   public/bibles/<TRANS>/<BOOK>.json   — { "<chapter>": { "<verse>": "text" } }
 *   public/bibles/<TRANS>/manifest.json — { translation, license, source, books, verseCount }
 *
 * Run:
 *   npx tsx scripts/build-bible-corpus.ts                  # all translations
 *   npx tsx scripts/build-bible-corpus.ts BSB KJV          # subset
 *
 * The script is idempotent. Re-running it overwrites existing files.
 * Verse counts are validated against the canonical 31,102 (Protestant 66-book).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import {
  BIBLE_BOOK_IDS,
  BIBLE_BOOK_META,
  lookupBookId,
  type BibleBookId,
} from '../src/lib/bible/books'
import {
  BIBLE_TRANSLATION_CODES,
  BIBLE_TRANSLATIONS,
  type BibleTranslationCode,
} from '../src/lib/bible/translations'

type ScrollmapperVerse = { verse: number; text: string }
type ScrollmapperChapter = { chapter: number; verses: ScrollmapperVerse[] }
type ScrollmapperBook = { name: string; chapters: ScrollmapperChapter[] }
type ScrollmapperJson = { translation: string; books: ScrollmapperBook[] }

type BookJson = Record<string, Record<string, string>>
type Corpus = Partial<Record<BibleBookId, BookJson>>

const PROJECT_ROOT = path.resolve(__dirname, '..')
const OUT_ROOT = path.join(PROJECT_ROOT, 'public', 'bibles')
const PROTESTANT_VERSE_COUNT = 31_102

const SCROLLMAPPER_SLUGS: Partial<Record<BibleTranslationCode, string>> = {
  BSB: 'BSB',
  KJV: 'KJV',
  ASV: 'ASV',
  YLT: 'YLT',
  BBE: 'BBE',
}

// Translations sourced from ebible.org's verse-per-line distribution.
// scrollmapper's Darby has missing-space artifacts around "God" so we use ebible.org instead.
const EBIBLE_VPL_SLUGS: Partial<Record<BibleTranslationCode, string>> = {
  WEB: 'eng-web',
  DARBY: 'engDBY',
}

// WEB book code remap — ebible.org's USFM-ish codes → our BibleBookId
const WEB_BOOK_REMAP: Record<string, BibleBookId> = {
  GEN: 'GEN', EXO: 'EXO', LEV: 'LEV', NUM: 'NUM', DEU: 'DEU',
  JOS: 'JOS', JDG: 'JDG', RUT: 'RUT',
  '1SA': '1SA', '2SA': '2SA', '1KI': '1KI', '2KI': '2KI',
  '1CH': '1CH', '2CH': '2CH', EZR: 'EZR', NEH: 'NEH', EST: 'EST',
  JOB: 'JOB', PSA: 'PSA', PRO: 'PRO', ECC: 'ECC', SOL: 'SNG',
  ISA: 'ISA', JER: 'JER', LAM: 'LAM', EZE: 'EZK', DAN: 'DAN',
  HOS: 'HOS', JOE: 'JOL', AMO: 'AMO', OBA: 'OBA', JON: 'JON',
  MIC: 'MIC', NAH: 'NAM', HAB: 'HAB', ZEP: 'ZEP', HAG: 'HAG',
  ZEC: 'ZEC', MAL: 'MAL',
  MAT: 'MAT', MAR: 'MRK', LUK: 'LUK', JOH: 'JHN', ACT: 'ACT',
  ROM: 'ROM', '1CO': '1CO', '2CO': '2CO', GAL: 'GAL', EPH: 'EPH',
  PHI: 'PHP', COL: 'COL', '1TH': '1TH', '2TH': '2TH',
  '1TI': '1TI', '2TI': '2TI', TIT: 'TIT', PHM: 'PHM', HEB: 'HEB',
  JAM: 'JAS', '1PE': '1PE', '2PE': '2PE',
  '1JO': '1JN', '2JO': '2JN', '3JO': '3JN',
  JUD: 'JUD', REV: 'REV',
}

function logStep(message: string) {
  process.stdout.write(`  ${message}\n`)
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function pushVerse(
  corpus: Corpus,
  bookId: BibleBookId,
  chapter: number,
  verse: number,
  text: string,
) {
  const cleaned = normalizeText(text)
  if (!cleaned) return
  const book = corpus[bookId] ?? (corpus[bookId] = {} as BookJson)
  const chap = book[String(chapter)] ?? (book[String(chapter)] = {})
  if (chap[String(verse)] !== undefined) {
    // Duplicate verse rows happen with versification quirks (e.g. Psalm titles).
    // Concatenate rather than overwrite so we don't lose content.
    chap[String(verse)] = `${chap[String(verse)]} ${cleaned}`.trim()
  } else {
    chap[String(verse)] = cleaned
  }
}

async function buildScrollmapper(
  code: BibleTranslationCode,
  slug: string,
): Promise<Corpus> {
  const url = `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/${slug}.json`
  logStep(`fetch ${url}`)
  const buf = await fetchBuffer(url)
  const json = JSON.parse(buf.toString('utf8')) as ScrollmapperJson

  const corpus: Corpus = {}

  for (const book of json.books) {
    const bookId = lookupBookId(book.name)
    if (!bookId) {
      logStep(`  skip unrecognized book "${book.name}" (likely Apocrypha)`)
      continue
    }
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        pushVerse(corpus, bookId, chapter.chapter, verse.verse, verse.text)
      }
    }
  }

  return corpus
}

async function buildFromEbibleVpl(slug: string): Promise<Corpus> {
  const tmpRoot = path.join(tmpdir(), 'euangelion-bible-corpus')
  await ensureDir(tmpRoot)
  const zipName = `${slug}_vpl.zip`
  const txtName = `${slug}_vpl.txt`
  const zipPath = path.join(tmpRoot, zipName)
  const txtPath = path.join(tmpRoot, txtName)
  const url = `https://ebible.org/Scriptures/${zipName}`

  logStep(`fetch ${url}`)
  const buf = await fetchBuffer(url)
  await fs.writeFile(zipPath, buf)

  logStep(`unzip → ${txtName}`)
  execSync(`unzip -o ${zipPath} ${txtName} -d ${tmpRoot}`, { stdio: 'pipe' })

  const text = await fs.readFile(txtPath, 'utf8')
  const corpus: Corpus = {}

  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    // Format: "<BOOK> <CH>:<VS> <text>"
    const match = line.match(/^(\S+)\s+(\d+):(\d+)\s+(.*)$/)
    if (!match) continue
    const [, rawBook, ch, vs, body] = match
    const bookId = WEB_BOOK_REMAP[rawBook]
    if (!bookId) continue // skip Apocrypha and any unrecognized
    pushVerse(corpus, bookId, Number(ch), Number(vs), body)
  }

  return corpus
}

function countVerses(corpus: Corpus): number {
  let total = 0
  for (const book of Object.values(corpus)) {
    if (!book) continue
    for (const chap of Object.values(book)) {
      total += Object.keys(chap).length
    }
  }
  return total
}

async function writeCorpus(
  code: BibleTranslationCode,
  corpus: Corpus,
): Promise<{
  bookCount: number
  verseCount: number
  missingBooks: BibleBookId[]
}> {
  const dir = path.join(OUT_ROOT, code)
  await ensureDir(dir)

  // Clear any stale book files
  const existing = await fs.readdir(dir).catch(() => [] as string[])
  await Promise.all(
    existing.map((name) =>
      fs.unlink(path.join(dir, name)).catch(() => undefined),
    ),
  )

  const missingBooks: BibleBookId[] = []
  let bookCount = 0
  let verseCount = 0

  for (const id of BIBLE_BOOK_IDS) {
    const book = corpus[id]
    if (!book) {
      missingBooks.push(id)
      continue
    }
    bookCount += 1
    verseCount += Object.values(book).reduce(
      (acc, chap) => acc + Object.keys(chap).length,
      0,
    )
    await fs.writeFile(
      path.join(dir, `${id}.json`),
      JSON.stringify(book) + '\n',
      'utf8',
    )
  }

  const meta = BIBLE_TRANSLATIONS[code]
  await fs.writeFile(
    path.join(dir, 'manifest.json'),
    JSON.stringify(
      {
        code,
        name: meta.name,
        license: meta.license,
        licenseShort: meta.licenseShort,
        year: meta.year,
        source: meta.source,
        bookCount,
        verseCount,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  return { bookCount, verseCount, missingBooks }
}

async function buildOne(code: BibleTranslationCode) {
  process.stdout.write(`[${code}]\n`)
  let corpus: Corpus
  const ebibleSlug = EBIBLE_VPL_SLUGS[code]
  if (ebibleSlug) {
    corpus = await buildFromEbibleVpl(ebibleSlug)
  } else {
    const slug = SCROLLMAPPER_SLUGS[code]
    if (!slug) throw new Error(`No source defined for ${code}`)
    corpus = await buildScrollmapper(code, slug)
  }

  const verseCount = countVerses(corpus)
  logStep(`parsed ${verseCount.toLocaleString()} verses`)

  const result = await writeCorpus(code, corpus)
  logStep(
    `wrote ${result.bookCount}/66 books, ${result.verseCount.toLocaleString()} verses`,
  )

  if (result.missingBooks.length > 0) {
    logStep(
      `missing books: ${result.missingBooks.map((b) => BIBLE_BOOK_META[b].name).join(', ')}`,
    )
  }

  const protestantDelta = Math.abs(result.verseCount - PROTESTANT_VERSE_COUNT)
  if (protestantDelta > 100) {
    logStep(
      `WARNING: verse count ${result.verseCount} differs from canonical 31,102 by ${protestantDelta}`,
    )
  } else {
    logStep(
      `verse count within tolerance of 31,102 (Δ ${protestantDelta})`,
    )
  }

  process.stdout.write('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const targets = (
    args.length > 0 ? (args as BibleTranslationCode[]) : [...BIBLE_TRANSLATION_CODES]
  ).filter((code) => {
    if (!BIBLE_TRANSLATION_CODES.includes(code)) {
      process.stderr.write(`Unknown translation: ${code}\n`)
      return false
    }
    return true
  })

  await ensureDir(OUT_ROOT)
  process.stdout.write(`Building ${targets.length} translation(s)\n\n`)

  for (const code of targets) {
    try {
      await buildOne(code)
    } catch (err) {
      process.stderr.write(`[${code}] FAILED: ${(err as Error).message}\n\n`)
      throw err
    }
  }

  process.stdout.write(`Done. Output: public/bibles/\n`)
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).stack || err}\n`)
  process.exit(1)
})
