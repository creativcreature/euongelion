// Server-only: reads Bible JSON from public/bibles/ via the Node fs API.
// Do NOT import this from a client component or from '@/lib/bible' barrel —
// import directly from '@/lib/bible/getVerse' inside server code.
//
// We deliberately do NOT use the `server-only` runtime guard here: it throws
// at import time anywhere outside Next.js's Server Component loader, which
// would break tsx scripts (corpus build, ad-hoc verification). The barrel
// re-export at `src/lib/bible/index.ts` keeps client bundles safe by never
// re-exporting this module — that's the structural protection.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseReference, type ParsedReference } from './parseReference'
import { BIBLE_BOOK_META, type BibleBookId } from './books'
import { BIBLE_TRANSLATIONS, type BibleTranslationCode } from './translations'

export type BibleBookData = Record<string, Record<string, string>>

export interface BibleVerse {
  chapter: number
  verse: number
  text: string
}

export interface VerseLookupResult {
  reference: string
  canonical: string
  translation: BibleTranslationCode
  verses: BibleVerse[]
  text: string
}

const bookCache = new Map<string, BibleBookData>()

function bookCacheKey(translation: BibleTranslationCode, book: BibleBookId) {
  return `${translation}/${book}`
}

async function loadBook(
  translation: BibleTranslationCode,
  book: BibleBookId,
): Promise<BibleBookData> {
  const cacheKey = bookCacheKey(translation, book)
  const cached = bookCache.get(cacheKey)
  if (cached) return cached

  const assetPath = `bibles/${translation}/${book}.json`

  // Mirror the reference-index loader's resolution order so verbatim Scripture
  // works in every environment, including a Cloudflare Durable Object / Worker
  // where `public/` lives behind the ASSETS binding, not the worker fs.
  let raw: string | null = null

  // Strategy 1: Cloudflare ASSETS binding (production — no network hop).
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const assets = (
      env as { ASSETS?: { fetch: (u: string) => Promise<Response> } }
    )?.ASSETS
    if (assets) {
      const res = await assets.fetch(`https://assets.local/${assetPath}`)
      if (res.ok) raw = await res.text()
    }
  } catch {
    // not on Cloudflare / ASSETS unavailable — fall through
  }

  // Strategy 2: local filesystem (dev / Node).
  if (raw === null) {
    try {
      const filePath = path.join(process.cwd(), 'public', assetPath)
      raw = await fs.readFile(filePath, 'utf8')
    } catch {
      // fs unavailable or file missing — fall through
    }
  }

  // Strategy 3: self-fetch the public asset (universal fallback).
  if (raw === null) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
      const res = await fetch(`${baseUrl}/${assetPath}`)
      if (res.ok) raw = await res.text()
    } catch {
      // fall through to the error below
    }
  }

  if (raw === null) {
    throw new Error(
      `Bible corpus file missing: ${translation}/${book}.json (tried ASSETS, fs, self-fetch)`,
    )
  }

  let parsed: BibleBookData
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `Bible corpus file is not valid JSON: ${translation}/${book}.json (${(err as Error).message})`,
    )
  }

  bookCache.set(cacheKey, parsed)
  return parsed
}

function collectVerses(
  data: BibleBookData,
  parsed: ParsedReference,
): BibleVerse[] {
  const out: BibleVerse[] = []

  if (parsed.startVerse === 0 && parsed.endVerse === 0) {
    for (let c = parsed.startChapter; c <= parsed.endChapter; c++) {
      const chapter = data[String(c)]
      if (!chapter) continue
      for (const verseKey of Object.keys(chapter).sort(
        (a, b) => Number(a) - Number(b),
      )) {
        out.push({
          chapter: c,
          verse: Number(verseKey),
          text: chapter[verseKey],
        })
      }
    }
    return out
  }

  if (parsed.startChapter === parsed.endChapter) {
    const chapter = data[String(parsed.startChapter)]
    if (!chapter) return out
    for (let v = parsed.startVerse; v <= parsed.endVerse; v++) {
      const text = chapter[String(v)]
      if (text !== undefined) {
        out.push({ chapter: parsed.startChapter, verse: v, text })
      }
    }
    return out
  }

  for (let c = parsed.startChapter; c <= parsed.endChapter; c++) {
    const chapter = data[String(c)]
    if (!chapter) continue
    const sortedVerses = Object.keys(chapter)
      .map(Number)
      .sort((a, b) => a - b)
    for (const v of sortedVerses) {
      if (c === parsed.startChapter && v < parsed.startVerse) continue
      if (c === parsed.endChapter && v > parsed.endVerse) continue
      out.push({ chapter: c, verse: v, text: chapter[String(v)] })
    }
  }

  return out
}

function joinVerseText(verses: BibleVerse[]): string {
  return verses.map((v) => v.text).join(' ')
}

export async function getVerse(
  reference: string,
  translation: BibleTranslationCode,
): Promise<VerseLookupResult> {
  if (!BIBLE_TRANSLATIONS[translation]) {
    throw new Error(`Unknown Bible translation: ${translation}`)
  }

  const parsed = parseReference(reference)
  if (!parsed) {
    throw new Error(`Could not parse Scripture reference: "${reference}"`)
  }

  const data = await loadBook(translation, parsed.book)
  const verses = collectVerses(data, parsed)

  if (verses.length === 0) {
    throw new Error(
      `No verses found for "${parsed.canonical}" in ${translation}. ` +
        `Book: ${BIBLE_BOOK_META[parsed.book].name}.`,
    )
  }

  return {
    reference,
    canonical: parsed.canonical,
    translation,
    verses,
    text: joinVerseText(verses),
  }
}

export function clearVerseCache() {
  bookCache.clear()
}
