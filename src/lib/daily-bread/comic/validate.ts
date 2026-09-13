/**
 * The Daily Bread V2 comic — script validation.
 *
 * validateComicScript is synchronous and structural: it decides whether a
 * script (hand-written template or generated JSON) can be drawn at all.
 * verifyComicCaptions is the async Scripture check: every caption must be a
 * verbatim piece of the BSB text of the strip's reference.
 */
import type {
  ComicFigureId,
  ComicScript,
  ComicSettingId,
} from '@/lib/daily-bread/types'

export const COMIC_SETTINGS: readonly ComicSettingId[] = [
  'field',
  'shore',
  'hillside',
  'road',
  'night',
  'room',
  'garden',
  'boat',
]

export const COMIC_FIGURES: readonly ComicFigureId[] = [
  'sower',
  'shepherd',
  'sheep',
  'lamp',
  'bread',
  'fish',
  'boat',
  'bird',
  'tree',
  'seed',
  'sprout',
  'door',
  'traveler',
  'well',
  'star',
  'sun',
  'wave',
]

export const COMIC_ID_PATTERN = /^[a-z0-9-]{3,60}$/
export const COMIC_CAPTION_MAX = 140

const SETTING_SET: ReadonlySet<string> = new Set(COMIC_SETTINGS)
const FIGURE_SET: ReadonlySet<string> = new Set(COMIC_FIGURES)

/** Straight quote marks and backticks never occur in the BSB corpus. */
const FOREIGN_QUOTES = /["'`]/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function inRange(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}

/** Structural problems with a comic script. An empty list means valid. */
export function validateComicScript(script: unknown): string[] {
  const problems: string[] = []
  if (!isRecord(script)) return ['script must be an object']

  const { id, title, scriptureReference, panels } = script

  if (typeof id !== 'string' || !COMIC_ID_PATTERN.test(id)) {
    problems.push('id must match /^[a-z0-9-]{3,60}$/')
  }
  if (
    typeof title !== 'string' ||
    title.trim().length < 3 ||
    title.length > 60
  ) {
    problems.push('title must be 3-60 characters')
  }
  if (
    typeof scriptureReference !== 'string' ||
    scriptureReference.trim().length === 0 ||
    scriptureReference.length > 40
  ) {
    problems.push('scriptureReference must be 1-40 characters')
  }
  if (!Array.isArray(panels) || panels.length !== 3) {
    problems.push('a strip has exactly 3 panels')
    return problems
  }

  panels.forEach((panel: unknown, p) => {
    const at = `panel ${p + 1}`
    if (!isRecord(panel)) {
      problems.push(`${at}: must be an object`)
      return
    }
    if (typeof panel.setting !== 'string' || !SETTING_SET.has(panel.setting)) {
      problems.push(`${at}: unknown setting "${String(panel.setting)}"`)
    }

    const figures = panel.figures
    if (!Array.isArray(figures) || figures.length < 1 || figures.length > 4) {
      problems.push(`${at}: needs 1-4 figures`)
    } else {
      figures.forEach((figure: unknown, f) => {
        const fat = `${at} figure ${f + 1}`
        if (!isRecord(figure)) {
          problems.push(`${fat}: must be an object`)
          return
        }
        if (
          typeof figure.figure !== 'string' ||
          !FIGURE_SET.has(figure.figure)
        ) {
          problems.push(`${fat}: unknown figure "${String(figure.figure)}"`)
        }
        if (!inRange(figure.x, 0, 1)) problems.push(`${fat}: x must be 0-1`)
        if (!inRange(figure.y, 0, 1)) problems.push(`${fat}: y must be 0-1`)
        if (!inRange(figure.scale, 0.3, 1.6)) {
          problems.push(`${fat}: scale must be 0.3-1.6`)
        }
        if (figure.flip !== undefined && typeof figure.flip !== 'boolean') {
          problems.push(`${fat}: flip must be a boolean`)
        }
      })
    }

    const description = panel.description
    if (
      typeof description !== 'string' ||
      description.trim().length < 10 ||
      description.length > 160
    ) {
      problems.push(`${at}: description must be 10-160 characters`)
    }

    const caption = panel.caption
    if (caption !== undefined) {
      if (typeof caption !== 'string' || caption.trim().length === 0) {
        problems.push(`${at}: caption must be a non-empty string when present`)
      } else {
        if (caption.length > COMIC_CAPTION_MAX) {
          problems.push(`${at}: caption must be at most 140 characters`)
        }
        if (caption.includes('<') || caption.includes('>')) {
          problems.push(`${at}: caption may not contain < or >`)
        }
        if (/http/i.test(caption)) {
          problems.push(`${at}: caption may not contain a link`)
        }
        if (FOREIGN_QUOTES.test(caption)) {
          problems.push(`${at}: caption contains quote marks not used by BSB`)
        }
      }
    }
  })

  return problems
}

function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Every caption must be a verbatim substring of the looked-up verse text
 * (whitespace-normalised). A lookup failure is reported, never swallowed.
 */
export async function verifyComicCaptions(
  script: ComicScript,
  lookup: (ref: string) => Promise<string>,
): Promise<string[]> {
  const captioned = script.panels
    .map((panel, index) => ({ caption: panel.caption, index }))
    .filter(
      (entry): entry is { caption: string; index: number } =>
        typeof entry.caption === 'string',
    )
  if (captioned.length === 0) return []

  let verse: string
  try {
    verse = normaliseWhitespace(await lookup(script.scriptureReference))
  } catch (err) {
    return [
      `could not look up ${script.scriptureReference}: ${(err as Error).message}`,
    ]
  }

  const problems: string[] = []
  for (const { caption, index } of captioned) {
    const wanted = normaliseWhitespace(caption)
    if (wanted.length === 0 || !verse.includes(wanted)) {
      problems.push(
        `panel ${index + 1}: caption is not verbatim ${script.scriptureReference} (BSB)`,
      )
    }
  }
  return problems
}
