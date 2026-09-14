/**
 * The editorial frame — the ONLY part of a Daily Bread V2 edition a language
 * model writes. It is deliberately small and low-risk:
 *
 *   deck         one standfirst sentence for the day (validated prose)
 *   rabbitHoles  2–4 Scripture references to follow, each with a short
 *                reason; the VERSE TEXT is looked up in the BSB, never written
 *                by the model
 *   comic        a choice from the committed wordless strip templates
 *   scene        a choice from the three procedural scenes
 *
 * No devotional theology, no quotations, no reported facts. The reading, the
 * prayer, the puzzles and every other module come from curated, reviewed or
 * deterministic sources. If every provider fails, the deterministic frame
 * below is used and the edition's provenance says so.
 */
import { parseReference } from '@/lib/bible/parseReference'
import { BIBLE_BOOK_META, isSingleChapterBook } from '@/lib/bible/books'
import type { RunLogger } from '../log'
import { createRng } from '../prng'
import { cleanText } from '../safe'
import type {
  PrimaryScripture,
  ProceduralSceneId,
  RabbitHole,
} from '../types'
import { extractJsonObject, runProviderChain, type ChainOutcome } from '../providers/chain'
import { OutputValidationError, type TextProvider } from '../providers/types'
import { proseProblems } from './guards'

export const PROCEDURAL_SCENES: readonly ProceduralSceneId[] = [
  'living-water',
  'grain',
  'wilderness-stars',
]

export interface ComicCandidate {
  id: string
  title: string
  scriptureReference: string
}

export interface FrameInput {
  dateSlug: string
  scripture: PrimaryScripture
  title: string
  teaser: string
  seriesTitle: string
  liturgicalLabel: string
  comicCandidates: ComicCandidate[]
  recentScenes: ProceduralSceneId[]
  seed: number
}

export interface EditorialFrame {
  deck: string
  rabbitHoles: RabbitHole[]
  comicTemplateId: string
  scene: ProceduralSceneId
  sceneLabel: string
}

export type VerseLookup = (reference: string) => Promise<{ canonical: string; text: string }>

const SCENE_LABELS: Record<ProceduralSceneId, string> = {
  'living-water': 'Slow water under a high horizon',
  grain: 'A field of grain under a low sun',
  'wilderness-stars': 'Stars over a dark wilderness ridge',
}

const SCENE_KEYWORDS: Record<ProceduralSceneId, RegExp> = {
  'living-water':
    /\b(water|waters|sea|river|rain|well|springs?|thirst|baptiz|wash|flood|jordan|galilee|fish|boat|storm|waves?)\b/i,
  grain:
    /\b(bread|grain|wheat|harvest|seed|sow|sower|field|reap|vine|fruit|barley|loaves|mustard|threshing)\b/i,
  'wilderness-stars':
    /\b(night|star|stars|wilderness|desert|dark|darkness|mountain|watch|dawn|morning|exile|lamp|light)\b/i,
}

export const FRAME_SYSTEM = [
  'You are the desk editor of The Daily Bread, a quiet daily paper for Christians published by Euangelion.',
  'You write very little. You never quote anyone, never report news or facts about people, never write prayers or theology, and never invent Scripture text.',
  'Voice: plain, concrete, unhurried, warm without sentiment. No clichés, no rhetorical questions, no exclamation marks, no emoji, no first person.',
  'Scripture references must be real Berean Standard Bible references in the form "Book Chapter:Verse" or "Book Chapter:Verse-Verse" (at most 4 verses).',
  'Return ONLY a JSON object. No prose before or after it.',
].join('\n')

/**
 * Catalog teasers sometimes open with a structural label ("THE PIVOT:",
 * "Resolution:") meant for the series outline, not for a reader.
 */
// One capitalised word ("Resolution:") or an all-caps phrase ("THE PIVOT:").
// A mixed-case phrase ("Morning in Galilee: ...") is ordinary prose.
const OUTLINE_LABEL = /^(?:[A-Z][A-Z' ]{2,24}|[A-Z][a-z]{2,15}):\s+(?=\S)/

export function stripOutlineLabel(text: string): string {
  return text.replace(OUTLINE_LABEL, '')
}

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Longest run of consecutive words `a` shares with `b`. */
export function sharedWordRun(a: string, b: string): number {
  const x = words(a)
  const y = words(b)
  let best = 0
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < y.length; j++) {
      let k = 0
      while (i + k < x.length && j + k < y.length && x[i + k] === y[j + k]) k++
      if (k > best) best = k
    }
  }
  return best
}

export function framePrompt(input: FrameInput): string {
  return [
    `Date: ${input.dateSlug}`,
    `Liturgical day: ${input.liturgicalLabel}`,
    `Today's reading: "${input.title}" from the series ${input.seriesTitle}.`,
    `The reading's one-line teaser: ${stripOutlineLabel(input.teaser)}`,
    `Primary Scripture (${input.scripture.reference}, BSB): ${input.scripture.text}`,
    '',
    'Produce this JSON object:',
    '{',
    '  "deck": "ONE sentence (60-200 characters) that sets up today\'s paper around the primary Scripture, in fresh words. The verse is printed right beside it, so do not restate it. No quotation marks, no leading label.",',
    '  "rabbitHoles": [ { "reference": "Book C:V", "why": "8-22 words: what following this passage opens up, stated plainly" } ],',
    '  "comicTemplateId": "one id from the list below whose parable best sits beside today\'s Scripture",',
    '  "scene": "living-water | grain | wilderness-stars",',
    '  "sceneLabel": "3-8 words describing that scene"',
    '}',
    'rabbitHoles: exactly 3 items that lead AWAY from today\'s passage.',
    `  - No verse from ${input.scripture.reference} itself, not even one verse inside that range.`,
    '  - No two rabbit holes may share a verse. Prefer passages from other books.',
    '',
    'Comic templates (id — title — reference):',
    ...input.comicCandidates.map((c) => `- ${c.id} — ${c.title} — ${c.scriptureReference}`),
  ].join('\n')
}

interface RawFrame {
  deck?: unknown
  rabbitHoles?: unknown
  comicTemplateId?: unknown
  scene?: unknown
  sceneLabel?: unknown
}

export function parseFrame(text: string): RawFrame {
  const obj = extractJsonObject(text)
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new OutputValidationError(['frame is not an object'])
  }
  return obj as RawFrame
}

interface VerseRange {
  book: string
  from: number
  to: number
}

/** A parsed reference as a comparable span (chapter * 1000 + verse). */
export function verseRange(p: NonNullable<ReturnType<typeof parseReference>>): VerseRange {
  const from = p.startChapter * 1000 + (p.startVerse === 0 ? 1 : p.startVerse)
  const to = p.endChapter * 1000 + (p.endVerse === 0 ? 999 : p.endVerse)
  return { book: p.book, from, to }
}

export function rangesOverlap(a: VerseRange, b: VerseRange): boolean {
  return a.book === b.book && a.from <= b.to && b.from <= a.to
}

/**
 * Validate a raw frame and resolve it into an EditorialFrame (verse text
 * filled from the BSB). Throws OutputValidationError with every problem.
 */
export async function resolveFrame(
  raw: RawFrame,
  input: FrameInput,
  lookup: VerseLookup,
  options: { rotationComicId?: string } = {},
): Promise<EditorialFrame> {
  const problems: string[] = []
  const rawDeck = typeof raw.deck === 'string' ? cleanText(raw.deck, 400) : ''
  const deck = rawDeck && !/[.!?]$/.test(rawDeck) ? `${rawDeck}.` : rawDeck
  problems.push(...proseProblems(deck, 'deck', { min: 60, max: 220 }))
  // One sentence, and no reference tacked on the end (gpt-5-nano appended
  // "Matthew 6:33" and a bare "33"); the paper prints the reference itself.
  if (/[.!?]\s+\S/.test(deck)) problems.push('deck: more than one sentence — write exactly one')
  if (/(?:\b[1-3]?\s?[A-Z][a-z]+\s+)?\d+(?::\d+(?:[-–]\d+)?)?\.?$/.test(deck)) {
    problems.push('deck: ends with a Scripture reference or number — end on words')
  }
  if (OUTLINE_LABEL.test(deck)) {
    problems.push(`deck: starts with an outline label (${deck.split(':')[0]}:) — write the sentence without it`)
  }
  // The Scripture is printed beside the deck; a deck that recites it adds
  // nothing (gpt-5-nano, 2026-09-14). A short allusion is fine.
  if (sharedWordRun(deck, input.scripture.text) >= 8) {
    problems.push('deck: restates the primary Scripture — set the day up in fresh words instead')
  }

  const comicIds = new Set(input.comicCandidates.map((c) => c.id))
  let comicTemplateId = typeof raw.comicTemplateId === 'string' ? raw.comicTemplateId : ''
  if (!comicIds.has(comicTemplateId)) {
    // A model reaches for the obvious parable even when it ran recently and is
    // withheld from the list (gpt-5-nano kept choosing look-at-the-birds for
    // Matthew 6, even when told why). The template is the lowest-stakes field,
    // so with a rotation pick available it takes that pick — the same choice the
    // deterministic frame makes — instead of discarding a valid deck and
    // rabbit holes. Anti-repeat is never bypassed.
    if (options.rotationComicId && comicIds.has(options.rotationComicId)) {
      comicTemplateId = options.rotationComicId
    } else {
      problems.push(
        `comicTemplateId: ${JSON.stringify(cleanText(comicTemplateId, 60))} is not one of the offered templates — copy one id exactly from the list`,
      )
    }
  }

  const scene = raw.scene as ProceduralSceneId
  if (!PROCEDURAL_SCENES.includes(scene)) problems.push('scene: unknown scene')
  const sceneLabel = typeof raw.sceneLabel === 'string' ? cleanText(raw.sceneLabel, 80) : ''
  problems.push(...proseProblems(sceneLabel, 'sceneLabel', { min: 8, max: 64 }))

  const holes: RabbitHole[] = []
  // A rabbit hole leads OUT of today's passage: it may not repeat or overlap
  // the primary Scripture, or another rabbit hole.
  // Each taken range carries a label so a rejection says exactly what it hit —
  // the reason is sent back to the model on its retry.
  const taken: { range: VerseRange; label: string }[] = []
  const primaryParsed = parseReference(input.scripture.reference)
  if (primaryParsed) {
    taken.push({ range: verseRange(primaryParsed), label: `the primary Scripture ${primaryParsed.canonical}` })
  }
  if (!Array.isArray(raw.rabbitHoles) || raw.rabbitHoles.length < 2 || raw.rabbitHoles.length > 4) {
    problems.push('rabbitHoles: expected 2-4 items')
  } else {
    for (const [i, item] of raw.rabbitHoles.entries()) {
      const ref = typeof (item as { reference?: unknown })?.reference === 'string'
        ? cleanText((item as { reference: string }).reference, 40)
        : ''
      const rawWhy = typeof (item as { why?: unknown })?.why === 'string'
        ? cleanText((item as { why: string }).why, 200)
        : ''
      // Printed as a sentence; small models often drop the capital or full stop.
      const capped = rawWhy.charAt(0).toUpperCase() + rawWhy.slice(1)
      const why = capped && !/[.!?]$/.test(capped) ? `${capped}.` : capped
      const parsed = parseReference(ref)
      if (!parsed) {
        problems.push(`rabbitHoles[${i}]: unparseable reference`)
        continue
      }
      const span =
        parsed.startChapter === parsed.endChapter ? parsed.endVerse - parsed.startVerse + 1 : 99
      if (parsed.startVerse === 0 || span > 4) {
        problems.push(`rabbitHoles[${i}]: reference must be 1-4 verses`)
        continue
      }
      const range = verseRange(parsed)
      const clash = taken.find((t) => rangesOverlap(t.range, range))
      if (clash) {
        problems.push(`rabbitHoles[${i}]: ${parsed.canonical} overlaps ${clash.label} — choose a different passage`)
        continue
      }
      problems.push(...proseProblems(why, `rabbitHoles[${i}].why`, { min: 30, max: 160 }))
      try {
        const verse = await lookup(parsed.canonical)
        taken.push({ range, label: `rabbitHoles[${i}] ${parsed.canonical}` })
        holes.push({ reference: verse.canonical, text: cleanText(verse.text, 700), why })
      } catch {
        problems.push(`rabbitHoles[${i}]: reference not found in BSB`)
      }
    }
  }

  if (problems.length > 0) throw new OutputValidationError(problems)
  return { deck, rabbitHoles: holes, comicTemplateId, scene, sceneLabel }
}

/** Scene choice without a model: Scripture keywords, then anti-repeat rotation. */
export function deterministicScene(input: FrameInput): ProceduralSceneId {
  const text = `${input.scripture.text} ${input.title} ${input.teaser}`
  const yesterday = input.recentScenes[0]
  const matches = PROCEDURAL_SCENES.filter((s) => SCENE_KEYWORDS[s].test(text))
  const preferred = matches.find((s) => s !== yesterday)
  if (preferred) return preferred
  const rng = createRng(input.seed ^ 0x5ce9e)
  const counts = new Map<ProceduralSceneId, number>()
  for (const s of input.recentScenes.slice(0, 6)) counts.set(s, (counts.get(s) ?? 0) + 1)
  const ranked = rng
    .shuffle(PROCEDURAL_SCENES)
    .filter((s) => s !== yesterday)
    .sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))
  return ranked[0] ?? PROCEDURAL_SCENES[0]
}

/** Context verses around a reference: "keep reading" without a model. */
export async function contextRabbitHoles(
  reference: string,
  lookup: VerseLookup,
): Promise<RabbitHole[]> {
  const parsed = parseReference(reference)
  if (!parsed) return []
  const book = BIBLE_BOOK_META[parsed.book].name
  const single = isSingleChapterBook(parsed.book)
  const at = (chapter: number, from: number, to: number) =>
    single ? `${book} ${from}-${to}` : `${book} ${chapter}:${from}-${to}`
  const candidates: { ref: string; why: string }[] = []
  if (parsed.startVerse > 1) {
    const from = Math.max(1, parsed.startVerse - 3)
    candidates.push({
      ref: at(parsed.startChapter, from, parsed.startVerse - 1),
      why: `What comes just before ${parsed.canonical}, which sets the scene for today's passage.`,
    })
  }
  if (parsed.endVerse > 0) {
    candidates.push({
      ref: at(parsed.endChapter, parsed.endVerse + 1, parsed.endVerse + 3),
      why: `What follows ${parsed.canonical}, where the passage keeps going.`,
    })
  } else if (!single) {
    candidates.push({
      ref: `${book} ${parsed.endChapter + 1}:1-3`,
      why: `The opening of the next chapter after ${parsed.canonical}.`,
    })
  }
  const out: RabbitHole[] = []
  for (const c of candidates) {
    try {
      const verse = await lookup(c.ref)
      out.push({ reference: verse.canonical, text: cleanText(verse.text, 700), why: c.why })
    } catch {
      // A passage at the edge of a book has no neighbour on that side.
    }
  }
  return out
}

export async function deterministicFrame(
  input: FrameInput,
  lookup: VerseLookup,
  pickComic: (seed: number) => string,
): Promise<EditorialFrame> {
  const scene = deterministicScene(input)
  return {
    deck: stripOutlineLabel(cleanText(input.teaser, 220)),
    rabbitHoles: await contextRabbitHoles(input.scripture.reference, lookup),
    comicTemplateId: pickComic(input.seed),
    scene,
    sceneLabel: SCENE_LABELS[scene],
  }
}

export async function composeFrame(
  input: FrameInput,
  deps: {
    providers: TextProvider[]
    lookup: VerseLookup
    pickComic: (seed: number) => string
    logger?: RunLogger
    timeoutMs?: number
    retries?: number
    sleep?: (ms: number) => Promise<void>
  },
): Promise<ChainOutcome<EditorialFrame>> {
  return runProviderChain<EditorialFrame>({
    task: 'editorial-frame',
    providers: deps.providers,
    request: {
      system: FRAME_SYSTEM,
      prompt: framePrompt(input),
      maxOutputTokens: 900,
      temperature: 0.5,
      json: true,
    },
    parse: (text) => {
      // Resolution needs async lookups, so parse only shapes; validate resolves.
      return parseFrame(text) as unknown as EditorialFrame
    },
    validate: async (value) => {
      try {
        const resolved = await resolveFrame(value as unknown as RawFrame, input, deps.lookup, {
          rotationComicId: deps.pickComic(input.seed),
        })
        Object.assign(value, resolved)
        return []
      } catch (error) {
        return error instanceof OutputValidationError ? error.problems : ['frame resolution failed']
      }
    },
    deterministic: () => deterministicFrame(input, deps.lookup, deps.pickComic),
    timeoutMs: deps.timeoutMs,
    retries: deps.retries,
    logger: deps.logger,
    sleep: deps.sleep,
  })
}
