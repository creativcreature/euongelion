/**
 * Segment extraction for the Audio Edition.
 *
 * Turns the real devotional data — catalog `Module[]` / `Panel[]`, and
 * generated-plan `DayContent` — into ordered, plain-text {@link TtsSegment}s
 * the player reads aloud. We read ONLY text that already exists in the
 * devotional; nothing is fabricated or summarized.
 */

import type { TtsSegment } from '@/lib/audio/tts-adapter'
import type { Module, Panel } from '@/types'
import type { DayContent } from '@/types/soul-audit-plan'

/**
 * Reduce light markdown / inline HTML to clean spoken prose:
 * strip emphasis markers, list bullets, headings, links → link text,
 * collapse whitespace. This keeps the voice from reading "asterisk".
 */
function toSpeech(raw: string | undefined | null): string {
  if (!raw) return ''
  return (
    raw
      .replace(/\{\{wn:[a-z0-9-]+\|([^}]*)\}\}/g, '$1') // inline WordNote → surface word
      .replace(/<[^>]+>/g, ' ') // any stray HTML tags
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1') // bold/italic
      .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // code
      .replace(/^#{1,6}\s+/gm, '') // headings
      .replace(/^>\s?/gm, '') // blockquotes
      .replace(/^\s*[-*+]\s+/gm, '') // bullets
      .replace(/^\s*\d+\.\s+/gm, '') // ordered list markers
      // Hebrew / Greek glyphs: a speech engine cannot pronounce them, so it
      // either skips or mangles the word. Inline prose that cites an original
      // spelling always supplies a parenthetical transliteration alongside it,
      // which survives here and is what gets spoken.
      .replace(/[\u0590-\u05FF\u0370-\u03FF\u1F00-\u1FFF\uFB1D-\uFB4F]+/g, '')
      .replace(/\(\s*\)/g, ' ') // parens left empty by the strip
      .replace(/[\u2014\u2013-]\s*[\u2014\u2013-]/g, '\u2014') // "- -" left by a strip
      .replace(/^[\s,;\u2014\u2013-]+|[\s,;\u2014\u2013-]+$/g, '')
      // Compatibility-normalize, then fold typographic punctuation to ASCII.
      // An ellipsis is a single U+2026 glyph: left alone it survives as its own
      // wordless token, which the renderer counts and the engine trips over.
      .normalize('NFKC')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\.{2,}(?!\.)/g, '.') // ".." typos and folded ellipses
      .replace(ROMAN_CUE, expandRomanMatch) // "chapter VIII" → "chapter eight"
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Roman numerals in citations. "chapter VIII" is ambiguous to a speech engine —
 * it may read the word or spell out the letters, and there is no way to tell
 * from a transcript because ASR writes both back as "VIII". Expanding at the
 * source removes the ambiguity. Only expanded after an explicit cue word, so
 * the pronoun "I" and words like "MIX" are never touched.
 */
const ROMAN_CUE =
  /\b(chapter|book|section|part|volume|canto|act|scene|appendix|psalm)\s+([IVXLC]{1,7})\b/gi
const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
}

function romanToInt(s: string): number | null {
  let total = 0
  let prev = 0
  for (const ch of [...s.toUpperCase()].reverse()) {
    const v = ROMAN_VALUES[ch]
    if (v === undefined) return null
    total = v < prev ? total - v : total + v
    prev = Math.max(prev, v)
  }
  return total || null
}

function expandRomanMatch(whole: string, cue: string, numeral: string): string {
  if (numeral !== numeral.toUpperCase()) return whole // lowercase = ordinary word
  const n = romanToInt(numeral)
  if (!n || n > 200) return whole
  return `${cue} ${numToWords(n)}`
}

/**
 * Reading contract versions.
 *
 * Contract 1 is what every track rendered before 2026-09-13 speaks, kept
 * byte-for-byte so those tracks stay current and are never re-rendered.
 * Contract 2 (SA-141, forward only) reads the lists the page renders, expands
 * scripture citations inside prose, and makes each paragraph its own segment.
 * The twin is `narration_extract.py`; a track's manifest entry records which
 * contract it was rendered with, and the hash test recomputes with that one.
 */
export const NARRATION_CONTRACT_LATEST = 2

function pushSegment(
  segments: TtsSegment[],
  label: string,
  text: string,
  {
    allowSingleWord = false,
    contract = 1,
  }: { allowSingleWord?: boolean; contract?: number } = {},
): void {
  const spoken = toSpeech(text)
  // A lone word mid-devotional is a label or a stray fragment, not prose. The
  // renderer applies the same floor, so the two stay in step. The title is
  // exempt: "Contentment" is the whole title of one day, and dropping it would
  // open that reading with no name at all.
  if (!allowSingleWord && spoken.split(/\s+/).filter(Boolean).length < 2) {
    return
  }
  if (contract < 2) {
    segments.push({ id: `seg-${segments.length}`, label, text: spoken })
    return
  }
  // Contract 2: one segment per paragraph, citations expanded. The floor above
  // still judges the whole field, so a short paragraph is never dropped.
  // Paragraphs, and each markdown list line within one: a list line has no
  // closing punctuation, so joined it runs into the next.
  for (const paragraph of (text ?? '').split(
    /\n\s*\n|\n(?=[ \t]*(?:[-*+]|\d+\.)[ \t])/,
  )) {
    const piece = toSpeech(paragraph)
    if (!piece) continue
    segments.push({
      id: `seg-${segments.length}`,
      label,
      text: speechV2(piece),
    })
  }
}

/**
 * Scripture citations inside prose (contract 2). Proved over the whole corpus
 * in euangelion-voice-prototype/FINDINGS-inline-citations-2026-09-12.md: 3,904
 * citations, zero false positives.
 */
const IN_PROSE_BOOK =
  '(?:[123]\\s+|I{1,3}\\s+)?(?:[A-Z][a-z]+)(?:\\s+(?:of\\s+)?[A-Z][a-z]+)?'
const IN_PROSE_BOOKED = new RegExp(
  `\\b(${IN_PROSE_BOOK})\\s+(\\d+):([1-9]\\d*)(?:\\s*[-–]\\s*(\\d+))?(?!\\d)`,
  'g',
)
const IN_PROSE_BARE =
  /(?<![A-Za-z0-9_:])(\d+):([1-9]\d*)(?:\s*[-–]\s*(\d+))?(?!\s*[ap]\.?m\.?)(?![\d:])/g
const NOT_A_BOOK = new Set([
  'The',
  'A',
  'An',
  'In',
  'At',
  'On',
  'And',
  'But',
  'For',
  'This',
  'That',
  'His',
  'Her',
  'Their',
  'It',
  'He',
  'She',
  'They',
  'We',
  'You',
  'When',
  'While',
  'Verse',
  'Verses',
  'Chapter',
  'See',
  'Compare',
  'Read',
  'Also',
  'From',
  'Psalm',
  'Psalms',
])

/**
 * Contract 2: every spoken piece ends as a sentence, so a heading, reference or
 * list item never runs into the next words. Mirrors `terminate` in Python.
 */
function terminate(text: string): string {
  const t = text.replace(/\s+$/, '')
  if (t && !'.!?:;"\')'.includes(t[t.length - 1])) return `${t}.`
  return t
}

/** "1 Corinthians" → "First Corinthians". The 66 books only (SA-141). Mirrors `expand_book_ordinals`. */
const NUMBERED_BOOK =
  /\b([123]) (Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John)\b/g
const ORDINAL_WORD: Record<string, string> = {
  '1': 'First',
  '2': 'Second',
  '3': 'Third',
}

function expandBookOrdinals(text: string): string {
  return text.replace(
    NUMBERED_BOOK,
    (_m, n: string, book: string) => `${ORDINAL_WORD[n]} ${book}`,
  )
}

/** "verse forty-four the order is" needs the comma a reader supplies. */
function citationPause(whole: string, offset: number, source: string): string {
  const next = source.slice(offset + whole.length, offset + whole.length + 2)
  return /^ [a-z]/.test(next) ? ',' : ''
}

function expandInProse(text: string): string {
  if (!text || !text.includes(':')) return text
  return text
    .replace(
      IN_PROSE_BOOKED,
      (
        whole: string,
        book: string,
        ch: string,
        v1: string,
        v2: string | undefined,
        offset: number,
        source: string,
      ) => {
        if (NOT_A_BOOK.has(book.split(/\s+/)[0])) return whole
        const arabic = book.replace(
          /^(I{1,3})\s+/,
          (_m, r: string) => `${r.length} `,
        )
        return (
          expandReference(`${arabic} ${ch}:${v1}${v2 ? `-${v2}` : ''}`) +
          citationPause(whole, offset, source)
        )
      },
    )
    .replace(
      IN_PROSE_BARE,
      (
        whole: string,
        ch: string,
        v1: string,
        v2: string | undefined,
        offset: number,
        source: string,
      ) => {
        const verses = v2
          ? `verses ${numToWords(+v1)} to ${numToWords(+v2)}`
          : `verse ${numToWords(+v1)}`
        return (
          `chapter ${numToWords(+ch)}, ${verses}` +
          citationPause(whole, offset, source)
        )
      },
    )
}

/**
 * Contract 2 spoken form of one paragraph. Mirrors `speech_v2` in Python:
 * changes what the voice is sent, never the page.
 */
function speechV2(text: string): string {
  let s = expandBookOrdinals(expandInProse(text))
  s = s.replace(/\bLORD\b/g, 'Lord').replace(/\bGOD\b/g, 'God')
  // Greek schizo, "to tear": spelled as written it can come out as the slur.
  s = s.replace(/\bschizo\b/g, 'skeezo')
  s = s.replace(/\b([A-HJ-Z])\. (?=[A-Z])/g, '$1 ')
  s = terminate(s)
  return s.replace(/([?!])\./g, '$1')
}

/** Mirrors `strip_nonlatin` in narration_extract.py exactly. */
function stripNonLatin(text: string): string {
  if (!text) return text
  return text
    .replace(/[֐-׿Ͱ-Ͽἀ-῿יִ-ﭏ]/g, '')
    .replace(/\(\s*\)/g, ' ')
    .replace(/[—–-]\s*[—–-]/g, '—')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[ ,;—–-]+|[ ,;—–-]+$/g, '')
}

/** Lists the page renders, in page order, with the page's own labels. */
const LIST_FIELDS: Record<string, Array<[string, string]>> = {
  vocab: [['relatedWords', 'See also: ']],
  reflection: [['additionalQuestions', '']],
  interactive: [['steps', '']],
  takeaway: [
    ['leavingAtCross', 'What I leave at the cross: '],
    ['receivingFromCross', 'What I receive from the cross: '],
  ],
  comprehension: [
    ['forReflection', 'For reflection: '],
    ['forAccountabilityPartners', 'For accountability partners: '],
  ],
}

/**
 * Spoken text for one list, one entry per item. Related words are one line on
 * the page, so one spoken line; steps are numbered on the page, so aloud too.
 */
function listItems(field: string, items: unknown[]): string[] {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  if (field === 'relatedWords') {
    const parts: string[] = []
    for (const it of items) {
      let part: string
      if (typeof it === 'string') part = it
      else if (it && typeof it === 'object') {
        const rec = it as Record<string, unknown>
        const head = s(rec.transliteration).trim() || stripNonLatin(s(rec.word))
        const meaning = s(rec.meaning).trim()
        part = head && meaning ? `${head} means ${meaning}` : head || meaning
      } else continue
      part = part.trim()
      if (part) parts.push(terminate(part[0].toUpperCase() + part.slice(1)))
    }
    return parts.length > 0 ? [parts.join(' ')] : []
  }
  if (field === 'leavingAtCross' || field === 'receivingFromCross') {
    const parts = items
      .filter((it): it is string => typeof it === 'string' && !!it.trim())
      .map((it) => it.trim().replace(/\.+$/, ''))
    return parts.length > 0 ? [terminate(parts.join('; '))] : []
  }
  const out: string[] = []
  items.forEach((it, i) => {
    let text = ''
    if (typeof it === 'string') text = it
    else if (it && typeof it === 'object') {
      const rec = it as Record<string, unknown>
      const title = s(rec.title).trim().replace(/\.+$/, '')
      const desc = s(rec.description).trim()
      text = title && desc ? `${title}. ${desc}` : title || desc
    }
    if (!text.trim()) return
    out.push(field === 'steps' ? `Step ${numToWords(i + 1)}. ${text}` : text)
  })
  return out
}

// ── Catalog devotionals: Module[] ──────────────────────────────────

/** A friendly spoken label per module type. */
function moduleLabel(module: Module, index: number): string {
  if (module.heading) return module.heading
  const byType: Partial<Record<string, string>> = {
    scripture: 'Scripture',
    vocab: 'Word study',
    teaching: 'Teaching',
    insight: 'Insight',
    story: 'Story',
    reflection: 'Reflection',
    prayer: 'Prayer',
    takeaway: 'Takeaway',
    bridge: 'Bridge',
    profile: 'The voice behind today',
    comprehension: 'One question',
    pullquote: 'Pull quote',
  }
  return byType[module.type] ?? `Section ${index + 1}`
}

/**
 * Navigation chrome — embeds, links and bibliography. Never spoken: these are
 * ways to leave the page, not part of the reading.
 */
const NAV_TYPES = new Set([
  'inline-image',
  'art',
  'video',
  'cta',
  'resource',
  // A pull quote lifts a sentence out of the prose and sets it large. Spoken,
  // that is a stutter — the listener hears the sentence in place and again out
  // of it. All 66 in the catalog duplicate body prose verbatim.
  'pullquote',
])

/**
 * Reading order per module type. Each inner array is a group of MIRRORED
 * field names — the first one present wins and the rest are skipped.
 *
 * Why the groups matter: the catalog stores the same prose under more than one
 * key (`teaching.content` and `teaching.body` are byte-identical in 1,410 of
 * the 1,422 modules that carry both). Reading every field would speak those
 * twice; reading a single hardcoded field — what this module did before — left
 * a median 29% of each devotional's distinct prose unspoken, including every
 * `profile` module, `insight.historicalContext`, `vocab.usageNote` and
 * `bridge.newTestamentEcho`.
 */
const READING_ORDER: Record<string, string[][]> = {
  scripture: [
    ['reference'],
    ['passage', 'text', 'fullPassage'],
    ['scriptureContext', 'context'],
  ],
  vocab: [
    ['meaning', 'definition'],
    ['rootMeaning', 'root_meaning'],
    ['usage'],
    ['usageNote', 'usage_note', 'usageNotes'],
    ['grammarNote', 'grammarSummary'],
  ],
  teaching: [['content', 'body'], ['keyInsight']],
  story: [['title'], ['content', 'body'], ['connectionToTheme']],
  insight: [
    ['content', 'body', 'text'],
    ['historicalContext'],
    ['fascinatingFact'],
  ],
  bridge: [
    ['ancientTruth', 'ancient'],
    ['modernApplication', 'modern'],
    ['connectionPoint', 'connection'],
    ['newTestamentEcho'],
    ['oldTestamentEcho'],
    ['question'],
  ],
  reflection: [['prompt', 'question', 'prompt_text']],
  prayer: [
    ['prayerText', 'text'],
    ['breathPrayer'],
    ['scriptureEcho', 'scripture_echo'],
  ],
  takeaway: [['commitment'], ['content', 'text'], ['action'], ['outcome']],
  comprehension: [['question'], ['explanation']],
  profile: [
    ['name', 'title'],
    ['era'],
    ['description', 'bio', 'summary'],
    ['keyTrait', 'key_trait'],
    ['keyQuote', 'key_quote'],
    ['lessonForUs'],
  ],
  interactive: [['instruction'], ['prompt'], ['follow_up']],
  recap: [['intro'], ['content'], ['integration_question']],
  sabbath: [['invitation'], ['content'], ['prayerText']],
  pullquote: [['quote', 'content']],
}

/**
 * Fields that are labels, identifiers, media paths or presentation hints —
 * never prose to read aloud. Everything NOT listed here is fair game for the
 * catch-all sweep below.
 */
const NON_PROSE = new Set([
  'type',
  'id',
  'slug',
  'heading',
  'translation',
  'language',
  'pronunciation',
  'strongsNumber',
  'invitationType',
  'prayerType',
  'interaction_type',
  'posture',
  'eyebrow',
  'dayLabel',
  'displayTitle',
  'heroImage',
  'heroImageAlt',
  'heroVariant',
  'markdown',
  'ctaLabel',
  'ctaHref',
  'ctaSubtext',
  'videoProvider',
  'videoId',
  'videoTitle',
  'videoCaption',
  'videoAttribution',
  'imageUrl',
  'imageAlt',
  'imageCaption',
  'inlineImageSrc',
  'inlineImageAlt',
  'inlineImageCaption',
  'inlineImageWidth',
  'duration',
  'location',
  'region',
  'modernDay',
  'no_modules_after',
  // original-script spellings: unpronounceable, and the transliteration
  // alongside them is what gets read
  'hebrewOriginal',
  'greekOriginal',
  'greekText',
  'word',
])

/** Spoken lead-ins so a bare field never arrives without context. */
const FIELD_PREFIX: Record<string, string> = {
  'profile.name': 'The voice behind today: ',
  'profile.title': 'The voice behind today: ',
  'profile.keyQuote': 'In his words: ',
  'profile.key_quote': 'In his words: ',
  'comprehension.question': 'One question. ',
  'vocab.usage': 'In use: ',
}

/** Contract 2 lead-ins read as sentences, not labels (proofread 2026-09-13). */
const FIELD_PREFIX_V2: Record<string, string> = {
  'profile.name': 'The voice behind today is ',
  'profile.title': 'The voice behind today is ',
  'comprehension.explanation': 'Here is the answer. ',
  'vocab.usage': '',
}

/** Read a possibly-untyped string field off a module. */
function str(module: Module, key: string): string | undefined {
  const value = (module as unknown as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined
}

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]
const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
]

function numToWords(n: number): string {
  if (n < 20) return ONES[n]
  if (n < 100) {
    return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')
  }
  if (n < 1000) {
    const rest = n % 100
    return `${ONES[Math.floor(n / 100)]} hundred${rest ? ` ${numToWords(rest)}` : ''}`
  }
  return String(n)
}

/**
 * "1 Thessalonians 5:2-3" → "First Thessalonians, chapter five, verses two to
 * three". Read literally, a reference comes out as digits and a colon; this is
 * what a reader would actually say aloud.
 */
export function expandReference(reference: string): string {
  const BOOK_ORDINAL: Record<string, string> = {
    '1': 'First',
    '2': 'Second',
    '3': 'Third',
  }
  const one = (part: string, carryBook?: string): string => {
    let s = part.trim().replace(/\.$/, '')
    if (carryBook && !/[A-Za-z]/.test(s)) {
      const m = s.match(/^(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?$/)
      if (m) {
        const verses = m[3]
          ? `verses ${numToWords(+m[2])} to ${numToWords(+m[3])}`
          : `verse ${numToWords(+m[2])}`
        return `chapter ${numToWords(+m[1])}, ${verses}`
      }
      const range = s.match(/^(\d+)\s*[-–]\s*(\d+)$/)
      if (range)
        return `verses ${numToWords(+range[1])} to ${numToWords(+range[2])}`
      if (/^\d+$/.test(s)) return `verse ${numToWords(+s)}`
      return s
    }
    let prefix = ''
    const ord = s.match(/^\s*([123])\s+(.+)$/)
    if (ord && /[A-Za-z]/.test(ord[2])) {
      prefix = `${BOOK_ORDINAL[ord[1]]} `
      s = ord[2]
    }
    const full = s.match(
      /^([^\d]+?)\s*(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*$/,
    )
    if (full) {
      const book = full[1].trim()
      const verses = full[4]
        ? `verses ${numToWords(+full[3])} to ${numToWords(+full[4])}`
        : `verse ${numToWords(+full[3])}`
      // "Psalm 23" is spoken "Psalm twenty-three", never "Psalm, chapter …"
      if (book.toLowerCase().replace(/s$/, '') === 'psalm') {
        return `${prefix}${book} ${numToWords(+full[2])}, ${verses}`
      }
      return `${prefix}${book}, chapter ${numToWords(+full[2])}, ${verses}`
    }
    const chapterOnly = s.match(/^([^\d]+?)\s*(\d+)\s*$/)
    if (chapterOnly) {
      const book = chapterOnly[1].trim()
      if (book.toLowerCase().replace(/s$/, '') === 'psalm') {
        return `${prefix}${book} ${numToWords(+chapterOnly[2])}`
      }
      return `${prefix}${book}, chapter ${numToWords(+chapterOnly[2])}`
    }
    return prefix + s
  }

  if (/;/.test(reference) || /,\s*\d/.test(reference)) {
    const parts = reference
      .split(/[;,]/)
      .map((p) => p.trim())
      .filter(Boolean)
    let book: string | undefined
    return parts
      .map((p) => {
        const out = one(p, book)
        if (!book)
          book = p.match(/^\s*[123]?\s*([A-Za-z][A-Za-z\s]+)/)?.[1]?.trim()
        return out
      })
      .join('; ')
  }
  return one(reference)
}

/**
 * Vocab modules define a word. Without the headword the reader speaks a bare
 * definition — "safety, security, certainty…" with no hint that the word is
 * asphaleia. The transliteration is spoken because the original-script glyph
 * is not pronounceable by a speech engine.
 */
function vocabHeadword(module: Module): string {
  const spoken = str(module, 'transliteration') ?? str(module, 'word')
  if (!spoken) return ''
  const language = (str(module, 'language') ?? '').toLowerCase()
  const label =
    language === 'hebrew'
      ? 'The Hebrew word'
      : language === 'greek'
        ? 'The Greek word'
        : 'The word'
  return `${label} ${spoken}`
}

/**
 * Module types whose heading is chrome rather than content — a bibliography
 * label, a button, a caption. Every other heading is spoken.
 */
const HEADING_NOT_SPOKEN = new Set([
  'resource',
  'cta',
  'video',
  'inline-image',
  'art',
])

/** The ordered text blocks a module contributes, deduped. */
function moduleBlocks(module: Module, contract = 1): string[] {
  const order = READING_ORDER[module.type]
  const blocks: string[] = []

  // A reader can see where a section begins; a listener cannot. Headings are
  // the only structural signposting narration has, and they already title the
  // chapters, so they are read as content.
  if (module.heading && !HEADING_NOT_SPOKEN.has(module.type)) {
    blocks.push(module.heading)
  }

  let vocabJoined = false
  if (module.type === 'vocab') {
    const head = vocabHeadword(module)
    const meaning = str(module, 'meaning') ?? str(module, 'definition')
    if (contract >= 2 && head && meaning) {
      // "The Hebrew word qadosh means holy; set apart for God."
      blocks.push(`${head} means ${meaning}`)
      vocabJoined = true
    } else if (head) blocks.push(head)
  }

  if (!order) {
    // Unknown type: read its prose fields rather than silently dropping them.
    for (const [key, value] of Object.entries(
      module as unknown as Record<string, unknown>,
    )) {
      if (key === 'heading' || key === 'type') continue
      if (typeof value === 'string' && value.trim().split(/\s+/).length >= 8) {
        blocks.push(value)
      }
    }
    return blocks
  }

  const consumed = new Set<string>()
  if (vocabJoined) {
    consumed.add('meaning')
    consumed.add('definition')
  }
  for (const group of order) {
    if (group.some((f) => consumed.has(f))) continue
    for (const field of group) {
      const value = str(module, field)
      if (value === undefined) continue
      let prefix = FIELD_PREFIX[`${module.type}.${field}`] ?? ''
      if (contract >= 2) {
        prefix = FIELD_PREFIX_V2[`${module.type}.${field}`] ?? prefix
      }
      let text =
        module.type === 'scripture' && field === 'reference'
          ? expandReference(value)
          : value
      const era = str(module, 'era')
      if (
        contract >= 2 &&
        module.type === 'profile' &&
        (field === 'name' || field === 'title') &&
        era
      ) {
        text = `${text}, ${era.trim()}`
        consumed.add('era')
      }
      blocks.push(prefix + text)
      group.forEach((f) => consumed.add(f)) // mirrors are covered too
      break // mirrored variants: first present wins
    }
  }

  if (contract >= 2) {
    const record = module as unknown as Record<string, unknown>
    for (const [field, lead] of LIST_FIELDS[module.type] ?? []) {
      const items = record[field]
      if (!Array.isArray(items)) continue
      consumed.add(field)
      listItems(field, items).forEach((item, i) => {
        blocks.push((i === 0 ? lead : '') + item)
      })
    }
  }

  // Catch-all: any substantial prose field the ordered list does not name is
  // still read. Without this, a field that appears in only a handful of
  // modules goes silent — exactly how `sabbath.content` (295 words) was lost.
  // Deduping in buildModuleSegments stops this re-reading mirrored text.
  for (const [key, value] of Object.entries(
    module as unknown as Record<string, unknown>,
  )) {
    if (consumed.has(key) || NON_PROSE.has(key)) continue
    if (typeof value !== 'string') continue
    if (value.trim().split(/\s+/).length < 12) continue
    blocks.push(value)
  }
  return blocks
}

/**
 * Title and subtitle are two separate sentences. Joined bare they run together
 * ("The Fruit of Lies On the harvest..."), so they are stitched with a period.
 */
export function openingLine(title: string, subtitle?: string): string {
  const parts = [title, subtitle]
    .map((x) => (x ?? '').trim().replace(/\.+$/, ''))
    .filter(Boolean)
  return parts.length > 0 ? parts.join('. ') + '.' : ''
}

/** Dedup key: prose identity, ignoring punctuation and case. */
function dedupKey(text: string): string {
  return toSpeech(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 220)
}

export function buildModuleSegments(
  title: string,
  modules: Module[],
  subtitle?: string,
  { contract = 1 }: { contract?: number } = {},
): TtsSegment[] {
  const segments: TtsSegment[] = []
  const seen = new Set<string>()
  const opening = openingLine(title, subtitle)
  pushSegment(segments, 'Title', opening, { allowSingleWord: true, contract })
  // The opening line counts as read. Several days repeat the devotional's own
  // title as the heading of a module inside it; without this the listener
  // hears it announced twice in a row.
  for (const part of [opening, title, subtitle]) {
    const k = dedupKey(part ?? '')
    if (k) seen.add(k)
  }

  modules.forEach((module, index) => {
    if (NAV_TYPES.has(module.type)) return
    const label = moduleLabel(module, index)
    for (const block of moduleBlocks(module, contract)) {
      // Never speak the same prose twice (pull quotes repeat body text, and
      // mirrored fields can survive the group check across module types).
      const key = dedupKey(block)
      if (key.length === 0 || seen.has(key)) continue
      seen.add(key)
      // A heading is deliberate signposting, so it is read even when it is a
      // single word ("Sabbath"). Only stray prose fragments are floored.
      pushSegment(segments, label, block, {
        allowSingleWord: block === module.heading,
        contract,
      })
    }
  })
  return segments
}

// ── Catalog devotionals: Panel[] (Wake-Up legacy format) ───────────

export function buildPanelSegments(
  title: string,
  panels: Panel[],
  subtitle?: string,
): TtsSegment[] {
  const segments: TtsSegment[] = []
  pushSegment(segments, 'Title', openingLine(title, subtitle), {
    allowSingleWord: true,
  })
  // Panel 0 is the cover; the rest carry the reading.
  panels.slice(1).forEach((panel, index) => {
    pushSegment(
      segments,
      panel.heading || `Section ${index + 1}`,
      panel.content,
    )
  })
  return segments
}

// ── Generated plan days: DayContent ────────────────────────────────

export function buildDayContentSegments(content: DayContent): TtsSegment[] {
  const segments: TtsSegment[] = []
  pushSegment(segments, 'Title', content.title, { allowSingleWord: true })
  if (content.scriptureReference) {
    pushSegment(segments, 'Scripture reference', content.scriptureReference)
  }
  pushSegment(segments, 'Scripture', content.scriptureText)
  // The grounded weave puts the full reading in textB; legacy days use hookA.
  pushSegment(segments, 'The reading', content.textB || content.hookA)
  if (content.centerC) pushSegment(segments, 'Center', content.centerC)
  if (content.christConnectionBPrime) {
    pushSegment(segments, 'Christ connection', content.christConnectionBPrime)
  }
  if (content.returnAPrime)
    pushSegment(segments, 'Return', content.returnAPrime)
  if (content.hebrewGreekStudy) {
    const w = content.hebrewGreekStudy
    pushSegment(
      segments,
      'Word study',
      `${w.word}, ${w.transliteration}. ${w.meaning}`,
    )
  }
  if (content.reflectionQuestions.length > 0) {
    pushSegment(segments, 'Reflect', content.reflectionQuestions.join('. '))
  }
  pushSegment(segments, 'Prayer', content.prayer)
  return segments
}
