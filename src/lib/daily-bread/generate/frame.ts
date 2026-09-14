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

export function framePrompt(input: FrameInput): string {
  return [
    `Date: ${input.dateSlug}`,
    `Liturgical day: ${input.liturgicalLabel}`,
    `Today's reading: "${input.title}" from the series ${input.seriesTitle}.`,
    `The reading's one-line teaser: ${input.teaser}`,
    `Primary Scripture (${input.scripture.reference}, BSB): ${input.scripture.text}`,
    '',
    'Produce this JSON object:',
    '{',
    '  "deck": "ONE sentence (60-200 characters) that sets up today\'s paper around the primary Scripture. No quotation marks.",',
    '  "rabbitHoles": [ { "reference": "Book C:V", "why": "8-22 words: what following this passage opens up, stated plainly" } ],',
    '  "comicTemplateId": "one id from the list below whose parable best sits beside today\'s Scripture",',
    '  "scene": "living-water | grain | wilderness-stars",',
    '  "sceneLabel": "3-8 words describing that scene"',
    '}',
    'rabbitHoles: exactly 3 items, all different from the primary Scripture and from each other.',
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
): Promise<EditorialFrame> {
  const problems: string[] = []
  const deck = typeof raw.deck === 'string' ? cleanText(raw.deck, 400) : ''
  problems.push(...proseProblems(deck, 'deck', { min: 60, max: 220 }))

  const comicIds = new Set(input.comicCandidates.map((c) => c.id))
  const comicTemplateId = typeof raw.comicTemplateId === 'string' ? raw.comicTemplateId : ''
  if (!comicIds.has(comicTemplateId)) problems.push('comicTemplateId: not one of the offered templates')

  const scene = raw.scene as ProceduralSceneId
  if (!PROCEDURAL_SCENES.includes(scene)) problems.push('scene: unknown scene')
  const sceneLabel = typeof raw.sceneLabel === 'string' ? cleanText(raw.sceneLabel, 80) : ''
  problems.push(...proseProblems(sceneLabel, 'sceneLabel', { min: 8, max: 64 }))

  const holes: RabbitHole[] = []
  // A rabbit hole leads OUT of today's passage: it may not repeat or overlap
  // the primary Scripture, or another rabbit hole.
  const taken: VerseRange[] = []
  const primaryParsed = parseReference(input.scripture.reference)
  if (primaryParsed) taken.push(verseRange(primaryParsed))
  if (!Array.isArray(raw.rabbitHoles) || raw.rabbitHoles.length < 2 || raw.rabbitHoles.length > 4) {
    problems.push('rabbitHoles: expected 2-4 items')
  } else {
    for (const [i, item] of raw.rabbitHoles.entries()) {
      const ref = typeof (item as { reference?: unknown })?.reference === 'string'
        ? cleanText((item as { reference: string }).reference, 40)
        : ''
      const why = typeof (item as { why?: unknown })?.why === 'string'
        ? cleanText((item as { why: string }).why, 200)
        : ''
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
      if (taken.some((t) => rangesOverlap(t, range))) {
        problems.push(`rabbitHoles[${i}]: overlaps the primary Scripture or another rabbit hole (duplicate)`)
        continue
      }
      problems.push(...proseProblems(why, `rabbitHoles[${i}].why`, { min: 30, max: 160 }))
      try {
        const verse = await lookup(parsed.canonical)
        taken.push(range)
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
  const deck = cleanText(input.teaser, 220)
  return {
    // Catalog teasers sometimes open with a structural label ("THE PIVOT:",
    // "Application:") meant for the series outline, not for a reader.
    deck: deck.replace(/^[A-Za-z][A-Za-z' ]{2,24}:\s+(?=[A-Z0-9])/, ''),
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
        const resolved = await resolveFrame(value as unknown as RawFrame, input, deps.lookup)
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
