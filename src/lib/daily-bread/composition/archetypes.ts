/**
 * The eight Daily Bread V2 archetypes. Each is a STRUCTURAL layout — a
 * different band sequence, measure and hierarchy — not a colour swap:
 *
 *   broadsheet   the newspaper: lead + rail, ruled bento sheet
 *   illuminated  a procedural scene as the front, Scripture as an illuminated
 *                page, the reading moved up to the second band
 *   quiet        one narrow column, few modules, long pauses, no games
 *   field-notes  a notebook: every main band carries a margin column
 *   red-letter   Christ's words set enormous at the top, reading-forward
 *   study-table  word study and puzzles first, the reading as the lesson
 *   joy          the funnies, the hymnal and good things up front
 *   prayer-book  the prayer as the front page, rubric-numbered, no games
 *
 * Modules an archetype does not place are appended to its back sheet in the
 * standard order, unless the archetype OMITS them (quiet and prayer-book
 * leave the games out on purpose — a smaller paper is the design, not a
 * failure, and the manifest records it).
 */
import type {
  AccentStrategy,
  ArchetypeId,
  CompositionDensity,
  EditionModuleType,
  ModuleTier,
  ModuleRole,
  MotionLevel,
  Placement,
  SeparatorStyle,
} from '../types'

export type Span = Placement['span']
export type Beat = 'dense' | 'open' | 'pause'

export interface Band {
  beat: Beat
  items: [EditionModuleType, Span][]
}

export interface ArchetypeDefinition {
  id: ArchetypeId
  name: string
  /** One line for the colophon: how today's paper is set. */
  description: string
  /** Modules that must be present for this archetype to be chosen. */
  requires: EditionModuleType[]
  front: Band[]
  bands: Band[]
  omit: EditionModuleType[]
  /**
   * The presentation this archetype is SET in (plan §37). Each value names
   * what `.db2-arch--<id>` in design-system/daily-bread-v2.css does; the
   * composition test holds them together.
   */
  presentation: {
    density: CompositionDensity
    accent: AccentStrategy
    separator: SeparatorStyle
    motion: MotionLevel
    /** Plan §40: how many rotating departments and interactives this paper prints. */
    departments: number
    interactives: number
  }
}

/**
 * Plan §40 roles. Anchors print whenever they exist: the Scripture, the
 * reading and its lead, the response (practice) and the prayer (§29), the
 * day's scene (the visual treatment), the day's rabbit holes (the edition's
 * own frame), and the comic — the founder's weekly Echo & Dust strip "continues
 * day to day" (2026-09-14). Everything else rotates.
 */
export const MODULE_ROLES: Record<EditionModuleType, ModuleRole> = {
  lead: 'anchor',
  reading: 'anchor',
  scripture: 'anchor',
  practice: 'anchor',
  prayer: 'anchor',
  scene: 'anchor',
  rabbitHoles: 'anchor',
  comic: 'anchor',
  word: 'department',
  redLetter: 'department',
  catechism: 'department',
  gallery: 'department',
  hymn: 'department',
  voices: 'department',
  archivePull: 'department',
  guides: 'department',
  proverb: 'department',
  goodNews: 'department',
  season: 'department',
  memoryVerse: 'department',
  question: 'department',
  planDay: 'department',
  witness: 'department',
  screening: 'department',
  letters: 'department',
  notices: 'department',
  crossword: 'interactive',
  unscramble: 'interactive',
  quiz: 'interactive',
  wordSearch: 'interactive',
  coloring: 'interactive',
}

export const MODULE_TIERS: Record<EditionModuleType, ModuleTier> = {
  lead: 'core',
  reading: 'core',
  scripture: 'core',
  scene: 'feature',
  comic: 'feature',
  rabbitHoles: 'feature',
  goodNews: 'feature',
  gallery: 'feature',
  guides: 'feature',
  hymn: 'standing',
  catechism: 'standing',
  archivePull: 'standing',
  planDay: 'standing',
  word: 'standing',
  practice: 'standing',
  prayer: 'standing',
  redLetter: 'standing',
  proverb: 'standing',
  memoryVerse: 'standing',
  question: 'standing',
  voices: 'standing',
  season: 'standing',
  witness: 'standing',
  screening: 'standing',
  letters: 'standing',
  notices: 'standing',
  crossword: 'play',
  unscramble: 'play',
  quiz: 'play',
  wordSearch: 'play',
  coloring: 'play',
}

/** Back-sheet order for modules an archetype leaves unplaced. */
export const STANDARD_ORDER: EditionModuleType[] = [
  'practice',
  'word',
  'redLetter',
  'comic',
  'season',
  'crossword',
  'catechism',
  'gallery',
  'unscramble',
  'archivePull',
  'guides',
  'wordSearch',
  'quiz',
  'hymn',
  'proverb',
  'memoryVerse',
  'question',
  'planDay',
  'rabbitHoles',
  'voices',
  'prayer',
  'goodNews',
  'witness',
  'screening',
  'letters',
  'notices',
  'scene',
  'coloring',
  'reading',
]

const GAMES: EditionModuleType[] = ['crossword', 'unscramble', 'quiz', 'wordSearch']

export const ARCHETYPES: Record<ArchetypeId, ArchetypeDefinition> = {
  broadsheet: {
    id: 'broadsheet',
    name: 'The Broadsheet',
    description: 'Set as a broadsheet: the lead and its rail, then the ruled sheet.',
    requires: ['lead', 'reading'],
    front: [{ beat: 'dense', items: [['lead', 'wide'], ['scripture', 'narrow']] }],
    bands: [
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'dense', items: [['practice', 'third'], ['word', 'third'], ['redLetter', 'third']] },
      { beat: 'open', items: [['comic', 'wide'], ['season', 'narrow']] },
      { beat: 'dense', items: [['crossword', 'wide'], ['catechism', 'narrow']] },
      { beat: 'pause', items: [['gallery', 'full']] },
      { beat: 'dense', items: [['unscramble', 'half'], ['archivePull', 'half']] },
      { beat: 'open', items: [['guides', 'full']] },
      { beat: 'dense', items: [['wordSearch', 'half'], ['quiz', 'half']] },
      { beat: 'open', items: [['hymn', 'wide'], ['proverb', 'narrow']] },
      { beat: 'dense', items: [['memoryVerse', 'third'], ['question', 'third'], ['planDay', 'third']] },
      { beat: 'open', items: [['rabbitHoles', 'wide'], ['voices', 'narrow']] },
      { beat: 'open', items: [['prayer', 'wide'], ['goodNews', 'narrow']] },
    ],
    omit: [],
    presentation: { density: 'dense', accent: 'standard', separator: 'ruled-grid', motion: 'full', departments: 7, interactives: 2 },
  },
  illuminated: {
    id: 'illuminated',
    name: 'The Illuminated Page',
    description: 'Set as an illuminated page: the scene and the Scripture first, the reading close behind.',
    requires: ['scene', 'scripture', 'reading'],
    front: [
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'open', items: [['scripture', 'full']] },
      { beat: 'open', items: [['lead', 'full']] },
    ],
    bands: [
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'open', items: [['prayer', 'wide'], ['voices', 'narrow']] },
      { beat: 'pause', items: [['gallery', 'full']] },
      { beat: 'open', items: [['hymn', 'half'], ['catechism', 'half']] },
      { beat: 'open', items: [['rabbitHoles', 'full']] },
      { beat: 'open', items: [['comic', 'full']] },
      { beat: 'dense', items: [['word', 'third'], ['redLetter', 'third'], ['memoryVerse', 'third']] },
    ],
    omit: ['quiz', 'unscramble', 'wordSearch'],
    presentation: { density: 'standard', accent: 'drop-cap', separator: 'open-front', motion: 'full', departments: 5, interactives: 1 },
  },
  quiet: {
    id: 'quiet',
    name: 'The Quiet Edition',
    description: 'Set as a quiet edition: one column, fewer pieces, room to stop.',
    requires: ['scripture', 'reading'],
    front: [
      { beat: 'pause', items: [['scripture', 'full']] },
      { beat: 'open', items: [['lead', 'full']] },
    ],
    bands: [
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'pause', items: [['prayer', 'full']] },
      { beat: 'open', items: [['question', 'full']] },
      { beat: 'open', items: [['memoryVerse', 'full']] },
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'open', items: [['hymn', 'full']] },
      { beat: 'open', items: [['voices', 'full']] },
      { beat: 'open', items: [['season', 'full']] },
    ],
    omit: [
      ...GAMES,
      'coloring',
      'gallery',
      'guides',
      'comic',
      'archivePull',
      'planDay',
      'redLetter',
      'proverb',
      'catechism',
      'word',
      'practice',
      'rabbitHoles',
      'goodNews',
      'witness',
      'screening',
      'letters',
      'notices',
    ],
    presentation: { density: 'sparse', accent: 'none', separator: 'hairline', motion: 'gentle', departments: 3, interactives: 0 },
  },
  'field-notes': {
    id: 'field-notes',
    name: 'Field Notes',
    description: 'Set as field notes: every piece with its margin, for reading with a pencil.',
    requires: ['lead', 'reading', 'rabbitHoles'],
    front: [{ beat: 'dense', items: [['lead', 'wide'], ['scripture', 'narrow']] }],
    bands: [
      { beat: 'open', items: [['rabbitHoles', 'wide'], ['word', 'narrow']] },
      { beat: 'open', items: [['reading', 'wide'], ['question', 'narrow']] },
      { beat: 'dense', items: [['comic', 'wide'], ['memoryVerse', 'narrow']] },
      { beat: 'open', items: [['guides', 'full']] },
      { beat: 'dense', items: [['crossword', 'wide'], ['catechism', 'narrow']] },
      { beat: 'pause', items: [['scene', 'half'], ['practice', 'half']] },
      { beat: 'open', items: [['prayer', 'wide'], ['proverb', 'narrow']] },
    ],
    omit: ['wordSearch'],
    presentation: { density: 'standard', accent: 'margin-notes', separator: 'dashed-margin', motion: 'full', departments: 5, interactives: 1 },
  },
  'red-letter': {
    id: 'red-letter',
    name: 'The Red Letter Edition',
    description: 'Set as a red letter edition: the words of Christ first, and large.',
    requires: ['redLetter', 'lead', 'reading'],
    front: [
      { beat: 'pause', items: [['redLetter', 'full']] },
      { beat: 'dense', items: [['lead', 'wide'], ['scripture', 'narrow']] },
    ],
    bands: [
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'open', items: [['prayer', 'wide'], ['voices', 'narrow']] },
      { beat: 'dense', items: [['comic', 'wide'], ['memoryVerse', 'narrow']] },
      { beat: 'dense', items: [['crossword', 'wide'], ['word', 'narrow']] },
      { beat: 'open', items: [['rabbitHoles', 'full']] },
    ],
    omit: [],
    presentation: { density: 'standard', accent: 'red-letter', separator: 'ruled-grid', motion: 'full', departments: 5, interactives: 1 },
  },
  'study-table': {
    id: 'study-table',
    name: 'The Study Table',
    description: 'Set as a study table: the word and the puzzles out first, the reading as the lesson.',
    requires: ['word', 'crossword', 'reading'],
    front: [{ beat: 'dense', items: [['lead', 'wide'], ['word', 'narrow']] }],
    bands: [
      { beat: 'dense', items: [['crossword', 'wide'], ['unscramble', 'narrow']] },
      { beat: 'dense', items: [['quiz', 'half'], ['wordSearch', 'half']] },
      { beat: 'open', items: [['rabbitHoles', 'wide'], ['scripture', 'narrow']] },
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'open', items: [['guides', 'full']] },
      { beat: 'dense', items: [['catechism', 'half'], ['planDay', 'half']] },
      { beat: 'pause', items: [['scene', 'full']] },
    ],
    omit: [],
    presentation: { density: 'dense', accent: 'tinted-word', separator: 'ruled-grid', motion: 'full', departments: 4, interactives: 3 },
  },
  joy: {
    id: 'joy',
    name: 'The Joy Edition',
    description: 'Set for joy: the funnies, the hymnal and good things up front.',
    requires: ['hymn', 'lead', 'reading'],
    front: [
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'dense', items: [['lead', 'wide'], ['scripture', 'narrow']] },
    ],
    bands: [
      { beat: 'open', items: [['comic', 'full']] },
      { beat: 'open', items: [['goodNews', 'wide'], ['hymn', 'narrow']] },
      { beat: 'pause', items: [['gallery', 'full']] },
      { beat: 'dense', items: [['quiz', 'half'], ['unscramble', 'half']] },
      { beat: 'open', items: [['coloring', 'full']] },
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'dense', items: [['season', 'third'], ['question', 'third'], ['proverb', 'third']] },
    ],
    omit: [],
    presentation: { density: 'standard', accent: 'bold-funnies', separator: 'ruled-grid', motion: 'full', departments: 5, interactives: 2 },
  },
  'prayer-book': {
    id: 'prayer-book',
    name: 'The Prayer Book',
    description: 'Set as a prayer book: the prayer first, then the Scripture and the reading.',
    requires: ['prayer', 'scripture', 'reading'],
    front: [
      { beat: 'pause', items: [['prayer', 'full']] },
      { beat: 'open', items: [['scripture', 'full']] },
      { beat: 'open', items: [['lead', 'full']] },
    ],
    bands: [
      { beat: 'open', items: [['reading', 'full']] },
      { beat: 'open', items: [['catechism', 'half'], ['voices', 'half']] },
      { beat: 'dense', items: [['question', 'third'], ['memoryVerse', 'third'], ['proverb', 'third']] },
      { beat: 'open', items: [['hymn', 'full']] },
      { beat: 'pause', items: [['scene', 'full']] },
      { beat: 'open', items: [['rabbitHoles', 'full']] },
    ],
    omit: [...GAMES, 'goodNews', 'archivePull'],
    presentation: { density: 'sparse', accent: 'rubric-numerals', separator: 'ruled-grid', motion: 'gentle', departments: 4, interactives: 0 },
  },
}

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[]
