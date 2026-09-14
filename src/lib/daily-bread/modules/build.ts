/**
 * Module builders for Daily Bread V2 — Node side (runs in CI / scripts, reads
 * the committed corpus from disk). Every module is built in isolation: one
 * module's failure is recorded (module name + redacted error) and the rest of
 * the paper continues. Nothing here calls a language model.
 *
 * Sources, in order of authority:
 *   1. edition_items rows that are live at the date's 7am rollover (the
 *      SA-090/114 review queue: published rows and unrejected drafts)
 *   2. the deterministic SA-090/092 generators and committed banks
 */
import { getVerse } from '@/lib/bible/getVerse'
import { parseReference } from '@/lib/bible/parseReference'
import { BIBLE_BOOK_META, isSingleChapterBook } from '@/lib/bible/books'
import { GUIDES, pickManyForDay } from '@/data/daily-edition'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import { pickVoiceForDay } from '@/data/voices-bank'
import { getSeasonEssay } from '@/data/season-essays'
import { pickCatechismForDay } from '@/data/catechism-bank'
import { pickHymnForDay } from '@/data/hymn-bank'
import { pickColoringForDay } from '@/data/coloring-bank'
import { GOOD_NEWS_ENTRIES, type GoodNewsEntry } from '@/data/daily-bread-good-news'
import { liturgicalDay } from '@/lib/liturgical'
import { getSeriesHero } from '@/lib/series-hero'
import type { Edition } from '@/lib/edition/store'
import { pageArchive, pageB365, pageProverb } from '@/lib/edition/page-modules'
import { buildWordSearch } from '@/lib/edition/wordsearch'
import type { GeneratedLeadArt } from '@/lib/edition/lead-art-generated'
import { generatePractice } from '@/lib/edition/generators/practice'
import { generateWord } from '@/lib/edition/generators/word'
import { generatePrayer } from '@/lib/edition/generators/prayer'
import { generateGallery } from '@/lib/edition/generators/gallery'
import { generateCrossword, generateQuiz, generateUnscramble } from '@/lib/edition/generators/puzzles'
import { generateRedLetter } from '@/lib/edition/generators/redletter'
import { generateVerse, verseForWeek } from '@/lib/edition/generators/verse'
import { generateQuestion } from '@/lib/edition/generators/question'
import { findSeriesForSlug, pickTodaySlug } from '@/lib/today-devotional'
import type { Devotional, Module, Panel } from '@/types'
import { errorMessage } from '../redact'
import { addDays, slugToUtcDate } from '../time'
import { cleanParagraphs, cleanText, safeAssetSrc, safeHref } from '../safe'
import type {
  AssetRef,
  EditionLiturgical,
  EditionModule,
  GoodNewsItem,
  LeadModule,
  PrimaryScripture,
  ReadingBlock,
  ReadingModule,
} from '../types'

export interface EditionSources {
  loadDevotional(slug: string): Promise<Devotional | null>
  lookupVerse(reference: string): Promise<{ canonical: string; text: string }>
  /** edition_items live at the date's rollover. */
  liveEditionItems(dateSlug: string): Promise<Edition>
  generatedLeadArt(dateSlug: string): Promise<GeneratedLeadArt | null>
  goodNews(dateSlug: string): readonly GoodNewsEntry[]
}

export interface ModuleFailure {
  module: string
  error: string
}

export interface BaseEdition {
  dateSlug: string
  rotationSlug: string
  liturgical: EditionLiturgical
  scripture: PrimaryScripture
  scriptureSource: 'lead' | 'devotional' | 'weekly-verse'
  lead: LeadModule | null
  reading: ReadingModule | null
  teaser: string
  seriesTitle: string
  modules: EditionModule[]
  failures: ModuleFailure[]
  assetFallbacks: string[]
  /** edition_items ids the edition was built from (re-checked at publish). */
  sourceItemIds: string[]
  liveItems: Edition
}

export const MAX_PRIMARY_VERSES = 6

/**
 * BSB lookup whose reference names the verses actually returned: a range that
 * runs past the end of a chapter ("Matthew 6:34-36") is reported as the verses
 * that exist ("Matthew 6:34"), never as verses that are not there.
 */
export async function bsbLookup(reference: string) {
  const r = await getVerse(reference, 'BSB')
  const parsed = parseReference(reference)
  const first = r.verses[0]
  const last = r.verses[r.verses.length - 1]
  if (!parsed || !first || !last) return { canonical: r.canonical, text: r.text }
  const name = BIBLE_BOOK_META[parsed.book].name
  const single = isSingleChapterBook(parsed.book)
  let canonical: string
  if (single) {
    canonical = first.verse === last.verse ? `${name} ${first.verse}` : `${name} ${first.verse}-${last.verse}`
  } else if (first.chapter === last.chapter) {
    canonical =
      first.verse === last.verse
        ? `${name} ${first.chapter}:${first.verse}`
        : `${name} ${first.chapter}:${first.verse}-${last.verse}`
  } else {
    canonical = `${name} ${first.chapter}:${first.verse}-${last.chapter}:${last.verse}`
  }
  return { canonical, text: r.text }
}

async function readDevotionalFromDisk(slug: string): Promise<Devotional | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null
  const { promises: fs } = await import('node:fs')
  const path = await import('node:path')
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'devotionals', `${slug}.json`), 'utf8')
    return JSON.parse(raw) as Devotional
  } catch {
    return null
  }
}

export function goodNewsForDate(dateSlug: string, entries: readonly GoodNewsEntry[] = GOOD_NEWS_ENTRIES) {
  return entries.filter((e) => e.runOn === dateSlug)
}

/** Default sources: the committed corpus + the live edition_items table. */
export function defaultEditionSources(): EditionSources {
  return {
    loadDevotional: readDevotionalFromDisk,
    lookupVerse: bsbLookup,
    async liveEditionItems(dateSlug) {
      const { getLiveEdition } = await import('@/lib/edition/deadline')
      const { rolloverInstant } = await import('../time')
      return getLiveEdition(dateSlug, rolloverInstant(dateSlug))
    },
    async generatedLeadArt(dateSlug) {
      const { getGeneratedLeadArt } = await import('@/lib/edition/lead-art-generated')
      return getGeneratedLeadArt(dateSlug)
    },
    goodNews: (dateSlug) => goodNewsForDate(dateSlug),
  }
}

/** Trim a long reference to at most MAX_PRIMARY_VERSES verses, in place. */
export function boundedReference(reference: string): string | null {
  const parsed = parseReference(reference)
  if (!parsed) return null
  const name = BIBLE_BOOK_META[parsed.book].name
  const single = isSingleChapterBook(parsed.book)
  const startVerse = parsed.startVerse === 0 ? 1 : parsed.startVerse
  const sameChapter = parsed.startChapter === parsed.endChapter && parsed.endVerse !== 0
  const endVerse = sameChapter
    ? Math.min(parsed.endVerse, startVerse + MAX_PRIMARY_VERSES - 1)
    : startVerse + MAX_PRIMARY_VERSES - 1
  const verses = startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`
  return single ? `${name} ${verses}` : `${name} ${parsed.startChapter}:${verses}`
}

function textOf(mod: Module, field: 'content' | 'prayerText' | 'commitment' | 'prompt' | 'passage'): string {
  const v = (mod as unknown as Record<string, unknown>)[field]
  return typeof v === 'string' ? v : ''
}

/** Convert a catalog devotional into plain reading blocks (no HTML). */
export function devotionalToReading(slug: string, devotional: Devotional, title: string): ReadingModule {
  const blocks: ReadingBlock[] = []
  const withModules = devotional as Devotional & { modules?: Module[] }
  const pushParas = (text: string) => {
    for (const p of cleanParagraphs(text, 20_000).split(/\n\s*\n/)) {
      const t = p.trim()
      if (t) blocks.push({ kind: 'paragraph', text: t })
    }
  }
  if (Array.isArray(withModules.modules) && withModules.modules.length > 0) {
    for (const mod of withModules.modules) {
      const heading = cleanText(mod.heading, 160)
      switch (mod.type) {
        case 'scripture': {
          const text = cleanParagraphs(textOf(mod, 'passage'), 6000)
          if (text) {
            blocks.push({
              kind: 'scripture',
              text,
              reference: cleanText(mod.reference, 80),
              translation: cleanText(mod.translation, 20),
            })
          }
          break
        }
        case 'vocab': {
          const word = cleanText(mod.hebrewOriginal ?? mod.word, 80)
          const meaning = cleanText((mod as unknown as { meaning?: string }).meaning ?? mod.definition, 300)
          if (word && meaning) {
            blocks.push({
              kind: 'vocab',
              word,
              meaning,
              root: cleanText((mod as unknown as { rootMeaning?: string }).rootMeaning, 300) || undefined,
            })
          }
          break
        }
        case 'teaching':
        case 'story':
        case 'insight':
        case 'bridge': {
          if (heading) blocks.push({ kind: 'heading', text: heading })
          pushParas(textOf(mod, 'content') || ((mod as unknown as { body?: string }).body ?? ''))
          break
        }
        case 'reflection': {
          const text = cleanText(textOf(mod, 'prompt'), 800)
          if (text) blocks.push({ kind: 'reflection', text })
          break
        }
        case 'prayer': {
          const text = cleanParagraphs(textOf(mod, 'prayerText') || textOf(mod, 'content'), 3000)
          if (text) blocks.push({ kind: 'prayer', text })
          break
        }
        case 'takeaway': {
          const text = cleanParagraphs(textOf(mod, 'commitment') || textOf(mod, 'content'), 1200)
          if (text) blocks.push({ kind: 'takeaway', text })
          break
        }
        default:
          break
      }
    }
  } else if (Array.isArray(devotional.panels)) {
    for (const panel of devotional.panels as Panel[]) {
      if (panel.type === 'cover') continue
      const heading = cleanText(panel.heading, 160)
      if (heading) blocks.push({ kind: 'heading', text: heading })
      pushParas(panel.content ?? '')
    }
  }
  return { type: 'reading', devotionalSlug: slug, title, blocks }
}

/** Run one module builder, recording (not swallowing) its failure. */
async function attempt<T>(
  name: string,
  failures: ModuleFailure[],
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    failures.push({ module: name, error: errorMessage(error, 300) })
    return null
  }
}

function sanitizeGoodNews(dateSlug: string, entries: readonly GoodNewsEntry[]): GoodNewsItem[] {
  const floor = addDays(dateSlug, -30)
  return entries
    .map((e) => ({
      headline: cleanText(e.headline, 140),
      summary: cleanText(e.summary, 400),
      sourceName: cleanText(e.sourceName, 80),
      sourceUrl: safeHref(e.sourceUrl) ?? '',
      publishedOn: e.publishedOn,
    }))
    .filter(
      (e) =>
        e.headline.length >= 10 &&
        e.summary.length >= 20 &&
        e.sourceName.length >= 2 &&
        e.sourceUrl.startsWith('https://') &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.publishedOn) &&
        e.publishedOn <= dateSlug &&
        e.publishedOn >= floor,
    )
}

/**
 * Build everything except the frame-dependent modules (comic, scene,
 * rabbit holes), which the orchestrator adds after the provider chain runs.
 */
export async function buildBaseEdition(dateSlug: string, sources: EditionSources): Promise<BaseEdition> {
  const date = slugToUtcDate(dateSlug)
  const failures: ModuleFailure[] = []
  const assetFallbacks: string[] = []
  const modules: EditionModule[] = []
  const sourceItemIds: string[] = []

  const lit = liturgicalDay(date)
  const liturgical: EditionLiturgical = {
    season: lit.season,
    seasonLabel: lit.seasonLabel,
    dayLabel: lit.dayLabel,
    color: lit.color,
    ...(lit.feast ? { feast: lit.feast } : {}),
  }

  const live =
    (await attempt('edition-items', failures, () => sources.liveEditionItems(dateSlug))) ?? {}
  const note = <T extends { id?: string }>(items: T[] | undefined): T[] => {
    for (const item of items ?? []) if (item.id) sourceItemIds.push(item.id)
    return items ?? []
  }

  const rotationSlug = pickTodaySlug(date)
  const meta = findSeriesForSlug(rotationSlug)
  const authoredItem = note(live.lead).find((l) => l.payload.mode === 'authored')
  const authored = authoredItem?.payload
  const devotional = authored
    ? null
    : await attempt('devotional', failures, async () => {
        const d = await sources.loadDevotional(rotationSlug)
        if (!d) throw new Error(`devotional ${rotationSlug} not found`)
        return d
      })

  const title = cleanText(
    authored?.title ?? devotional?.title ?? meta?.day.title ?? '',
    200,
  )
  const teaser = cleanText(
    authored?.standfirst ?? DEVOTIONAL_TEASERS[rotationSlug] ?? meta?.series.question ?? '',
    400,
  )
  const seriesTitle = authored ? 'The Sunday Feature' : cleanText(meta?.series.title ?? '', 120)

  // ── Primary Scripture (core) ──────────────────────────────────────────
  const firstScriptureModule = (
    (devotional as (Devotional & { modules?: Module[] }) | null)?.modules ?? []
  ).find((m) => m.type === 'scripture' && typeof m.reference === 'string')
  const candidates: { ref: string | undefined; source: BaseEdition['scriptureSource'] }[] = [
    { ref: authored?.scriptureReference, source: 'lead' },
    { ref: devotional?.scriptureReference ?? firstScriptureModule?.reference, source: 'devotional' },
  ]
  let scripture: PrimaryScripture | null = null
  let scriptureSource: BaseEdition['scriptureSource'] = 'weekly-verse'
  for (const c of candidates) {
    if (!c.ref) continue
    // Catalog references are often compound ("Matthew 6:25-33, Matthew
    // 5:43-48"); the first parseable passage is the day's primary Scripture.
    const bounded = c.ref
      .split(/[,;+]|\s-\s/)
      .map((part) => boundedReference(part.trim()))
      .find((r): r is string => r !== null)
    if (!bounded) continue
    try {
      const v = await sources.lookupVerse(bounded)
      scripture = { reference: v.canonical, text: cleanText(v.text, 1600), translation: 'BSB' }
      scriptureSource = c.source
      break
    } catch (error) {
      failures.push({ module: 'scripture', error: errorMessage(error, 200) })
    }
  }
  if (!scripture) {
    // The week's memory verse is committed, verified Scripture: a real
    // primary Scripture, recorded as a fallback source.
    const v = await sources.lookupVerse(verseForWeek(date))
    scripture = { reference: v.canonical, text: cleanText(v.text, 1600), translation: 'BSB' }
    scriptureSource = 'weekly-verse'
  }
  modules.push({ type: 'scripture', scripture })

  // ── Lead + reading (core) ─────────────────────────────────────────────
  let lead: LeadModule | null = null
  let reading: ReadingModule | null = null
  if (authored?.body && title) {
    lead = {
      type: 'lead',
      title,
      deck: teaser,
      scriptureReference: scripture.reference,
      seriesTitle,
      seriesSlug: '',
      dayNumber: 1,
      devotionalSlug: '',
      authored: true,
    }
    reading = {
      type: 'reading',
      devotionalSlug: '',
      title,
      blocks: cleanParagraphs(authored.body.replace(/\{\{wn:[^|}]+\|([^}]+)\}\}/g, '$1'), 20_000)
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((text) => ({ kind: 'paragraph' as const, text })),
    }
  } else if (devotional && title) {
    reading = devotionalToReading(rotationSlug, devotional, title)
    if (reading.blocks.length === 0) {
      failures.push({ module: 'reading', error: `devotional ${rotationSlug} has no readable blocks` })
      reading = null
    }
    lead = {
      type: 'lead',
      title,
      deck: teaser,
      scriptureReference: scripture.reference,
      seriesTitle,
      seriesSlug: meta?.seriesSlug ?? '',
      dayNumber: meta?.day.day ?? 1,
      devotionalSlug: rotationSlug,
      authored: false,
    }
  }

  // Lead plate: generated daily plate → Vasari print matched to the day's
  // words → the series' riso art. Each step down is recorded.
  if (lead) {
    const plate = await attempt('lead-plate', failures, async (): Promise<AssetRef | undefined> => {
      const generated = await sources.generatedLeadArt(dateSlug).catch(() => null)
      const genSrc = generated ? safeAssetSrc(generated.src) : null
      if (generated && genSrc) {
        return {
          id: `generated:${dateSlug}`,
          src: genSrc,
          width: generated.width,
          height: generated.height,
          alt: cleanText(generated.alt, 140),
          kind: 'generated-plate',
        }
      }
      // LEAD PLATE POLICY (CLAUDE.md "no arbitrary image use"): a plate is
      // either made for the day (above) or the series' own riso art. Keyword
      // matching against the print library was tried and printed Bosch's Ship
      // of Fools over the Emmaus feature and Vermeer's Girl with a Pearl
      // Earring over a kingdom reading, so V2 does not use it for the lead;
      // prints appear in the Gallery, where they are presented as prints. An
      // authored Sunday feature carries no plate unless one was made for it,
      // as in the SA-090 paper.
      if (lead.authored) {
        assetFallbacks.push('lead-plate: authored feature without a generated plate')
        return undefined
      }
      assetFallbacks.push('lead-plate: no generated plate; series art')
      const hero = lead.seriesSlug ? getSeriesHero(lead.seriesSlug) : undefined
      const heroSrc = hero ? safeAssetSrc(hero.src) : null
      if (hero && heroSrc) {
        return { id: `series:${lead.seriesSlug}`, src: heroSrc, alt: '', kind: 'series-hero' }
      }
      assetFallbacks.push('lead-plate: none')
      return undefined
    })
    if (plate) lead.plate = plate
    modules.push(lead)
  } else {
    failures.push({ module: 'lead', error: 'no lead could be built (no authored lead and no devotional)' })
  }
  if (reading) modules.push(reading)

  // ── Standing modules ──────────────────────────────────────────────────
  const practice = note(live.practice)[0]?.payload ??
    (await attempt('practice', failures, async () => (await generatePractice(date))[0]?.payload))
  if (practice) modules.push({ type: 'practice', practice })

  const word = note(live.word)[0]?.payload ??
    (await attempt('word', failures, async () => (await generateWord(date))[0]?.payload))
  if (word) modules.push({ type: 'word', word })

  const prayer = note(live.prayer)[0]?.payload ??
    (await attempt('prayer', failures, async () => (await generatePrayer(date))[0]?.payload))
  if (prayer) modules.push({ type: 'prayer', prayer })

  const saying = note(live.redletter)[0]?.payload ??
    (await attempt('redLetter', failures, async () => (await generateRedLetter(date))[0]?.payload))
  if (saying) modules.push({ type: 'redLetter', saying })

  const proverb = await attempt('proverb', failures, async () => pageProverb(date))
  if (proverb) modules.push({ type: 'proverb', ...proverb })

  const verse = await attempt('memoryVerse', failures, async () => (await generateVerse(date))[0]?.payload)
  if (verse) modules.push({ type: 'memoryVerse', verse })

  const question = await attempt('question', failures, async () => (await generateQuestion(date))[0]?.payload)
  if (question) modules.push({ type: 'question', question: question.question })

  const voice = await attempt('voices', failures, async () => pickVoiceForDay(date))
  if (voice) modules.push({ type: 'voices', quote: voice.quote, author: voice.author, work: voice.work })

  const season = await attempt('season', failures, async () => getSeasonEssay(lit))
  if (season) modules.push({ type: 'season', season })

  const hymn = await attempt('hymn', failures, async () => pickHymnForDay(date))
  if (hymn) modules.push({ type: 'hymn', ...hymn })

  const catechism = await attempt('catechism', failures, async () => pickCatechismForDay(date))
  if (catechism) modules.push({ type: 'catechism', ...catechism })

  const archive = await attempt('archivePull', failures, async () => pageArchive(date, rotationSlug))
  if (archive) {
    const image = safeAssetSrc(archive.image)
    modules.push({ type: 'archivePull', ...archive, image: image ?? '' })
  }

  const plan = await attempt('planDay', failures, async () => pageB365(date))
  if (plan) modules.push({ type: 'planDay', ...plan })

  // Guides: the day's written guides when they exist, else the bank rotation.
  const guideRows = note(live.guide).map((g, i) => ({ ...g.payload, slug: `daily/${dateSlug}#g${i + 1}` }))
  const dayOfYear =
    Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86_400_000) + 1
  const guides = guideRows.length > 0 ? guideRows : pickManyForDay(GUIDES, dayOfYear, 3)
  if (guides.length > 0) {
    modules.push({
      type: 'guides',
      guides: guides.map((g) => ({ ...g, image: safeAssetSrc(g.image) ?? '' })),
    })
  }

  const galleryRows = note(live.gallery).map((g) => g.payload)
  const plates =
    galleryRows.length > 0
      ? galleryRows
      : ((await attempt('gallery', failures, async () => (await generateGallery(date)).map((g) => g.payload))) ?? [])
  const safePlates = plates.filter((p) => safeAssetSrc(p.image))
  if (safePlates.length > 0) modules.push({ type: 'gallery', plates: safePlates })

  // ── Play ──────────────────────────────────────────────────────────────
  const crossword = note(live.crossword)[0]?.payload ??
    (await attempt('crossword', failures, async () => (await generateCrossword(date))[0]?.payload))
  if (crossword) modules.push({ type: 'crossword', puzzle: crossword })

  const unscramble = note(live.unscramble)[0]?.payload ??
    (await attempt('unscramble', failures, async () => (await generateUnscramble(date))[0]?.payload))
  if (unscramble) modules.push({ type: 'unscramble', puzzle: unscramble })

  const quizRows = note(live.quiz).map((q) => q.payload)
  const quiz =
    quizRows.length > 0
      ? quizRows
      : ((await attempt('quiz', failures, async () => (await generateQuiz(date)).map((q) => q.payload))) ?? [])
  if (quiz.length > 0) modules.push({ type: 'quiz', questions: quiz.slice(0, 3) })

  const wordSearch = await attempt('wordSearch', failures, async () => buildWordSearch(date))
  if (wordSearch) modules.push({ type: 'wordSearch', puzzle: wordSearch })

  const coloring = await attempt('coloring', failures, async () => pickColoringForDay(date))
  if (coloring) modules.push({ type: 'coloring', art: coloring })

  // ── Reported / reviewed sections (only when real entries exist) ───────
  const witness = note(live.witness)[0]?.payload
  if (witness) modules.push({ type: 'witness', witness })

  const screening = note(live.screening)
    .map((s) => s.payload)
    .map((s) => {
      const href = safeHref(s.sourceUrl)
      const thumb = s.thumbnail ? safeHref(s.thumbnail) : null
      const thumbOk = thumb && /^https:\/\/(i\.ytimg\.com|img\.youtube\.com)\//.test(thumb)
      return href ? { ...s, sourceUrl: href, thumbnail: thumbOk ? thumb : undefined } : null
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
  if (screening.length > 0) modules.push({ type: 'screening', items: screening })

  const letters = note(live.letter).map((l) => l.payload)
  if (letters.length > 0) modules.push({ type: 'letters', letters })

  const notices = note(live.notice)
    .map((n) => n.payload)
    .map((n) => {
      const href = n.href ? safeHref(n.href) : null
      return { ...n, href: href ?? undefined }
    })
  if (notices.length > 0) modules.push({ type: 'notices', notices })

  const goodNews = sanitizeGoodNews(dateSlug, sources.goodNews(dateSlug))
  if (goodNews.length > 0) modules.push({ type: 'goodNews', items: goodNews })

  return {
    dateSlug,
    rotationSlug,
    liturgical,
    scripture,
    scriptureSource,
    lead,
    reading,
    teaser,
    seriesTitle,
    modules,
    failures,
    assetFallbacks,
    sourceItemIds,
    liveItems: live,
  }
}
