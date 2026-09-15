/**
 * The Daily Bread V2 — the domain contract (SA-142 / F-184).
 *
 * A DailyEdition is a FROZEN document. Everything a reader sees on
 * /daily-bread/YYYY-MM-DD is inside it: no module is recomputed at request
 * time, no provider is called at request time, no image is generated at
 * request time. The builder (Node, CI) assembles it; the page renders it.
 *
 * Secrets never appear here. `generation` records provider ids, model names,
 * token counts and cost estimates only.
 */
import type {
  CrosswordPayload,
  GalleryPayload,
  GuidePayload,
  LetterPayload,
  NoticePayload,
  PracticePayload,
  PrayerPayload,
  QuizPayload,
  RedLetterPayload,
  ScreeningPayload,
  UnscramblePayload,
  VersePayload,
  WitnessPayload,
  WordPayload,
} from '@/lib/edition/kinds'
import type { SeasonEssayView } from '@/data/season-essays'
import type { ColoringArt } from '@/data/coloring-bank'
import type { WordSearchPuzzle } from '@/lib/edition/wordsearch'

export const DAILY_BREAD_SCHEMA_VERSION = 1
export const DAILY_BREAD_RENDERER_VERSION = 'db2-r1'

export type EditionLifecycle =
  | 'draft'
  | 'assembling'
  | 'ready'
  | 'published'
  | 'superseded'

export type EditionQuality = 'normal' | 'fallback' | 'minimum'
export type ArchiveOrigin = 'native' | 'backfilled'

export interface PrimaryScripture {
  reference: string
  text: string
  translation: 'BSB'
}

export interface EditionLiturgical {
  season: string
  seasonLabel: string
  dayLabel: string
  color: string
  feast?: string
}

/* ── Modules ─────────────────────────────────────────────────────────── */

/** Tier decides prominence and what survives a minimum edition. */
export type ModuleTier = 'core' | 'feature' | 'standing' | 'play'

export type ReadingBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'scripture'; text: string; reference: string; translation: string }
  | { kind: 'reflection'; text: string }
  | { kind: 'prayer'; text: string }
  | { kind: 'takeaway'; text: string }
  | { kind: 'vocab'; word: string; meaning: string; root?: string }

export interface LeadModule {
  type: 'lead'
  title: string
  deck: string
  scriptureReference: string
  seriesTitle: string
  seriesSlug: string
  dayNumber: number
  devotionalSlug: string
  authored: boolean
  plate?: AssetRef
}

export interface ReadingModule {
  type: 'reading'
  devotionalSlug: string
  title: string
  blocks: ReadingBlock[]
}

export interface ScriptureModule {
  type: 'scripture'
  scripture: PrimaryScripture
}

export interface SceneModule {
  type: 'scene'
  scene: ProceduralSceneId
  renderer: ProceduralRendererId
  seed: number
  /** Accessible description of the (decorative) scene, for the poster alt. */
  label: string
}

export interface ComicPanelFigure {
  figure: ComicFigureId
  x: number
  y: number
  scale: number
  flip?: boolean
}

export interface ComicPanel {
  setting: ComicSettingId
  figures: ComicPanelFigure[]
  /** One sentence describing the panel for screen readers. */
  description: string
  /** Optional verbatim Scripture line (validated against BSB). */
  caption?: string
}

export interface ComicScript {
  id: string
  title: string
  scriptureReference: string
  panels: ComicPanel[]
}

/**
 * How the day's comic was sourced; recorded on the module and in provenance.
 * The funnies are Echo & Dust (comic/chain.ts):
 *   approved-art     the date's Echo & Dust strip
 *   archive-reprint  a founder-published Echo & Dust strip, reprinted
 *   omitted          no strip
 * LEGACY, never produced since 2026-09-14: 'generated-script' and
 * 'deterministic-script' were a wordless silhouette strip that replaced Echo &
 * Dust by mistake. They remain only so frozen snapshots still type-check until
 * those editions are corrected by revision.
 */
export type ComicSourceLevel =
  | 'approved-art'
  | 'generated-script'
  | 'deterministic-script'
  | 'archive-reprint'
  | 'omitted'

export interface ComicModule {
  type: 'comic'
  level: Exclude<ComicSourceLevel, 'omitted'>
  title: string
  caption: string
  /** LEGACY silhouette strip script (frozen snapshots only). */
  script?: ComicScript
  image?: { src: string; width: number; height: number; alt: string }
  /** The Echo & Dust strip's panel id (edition_items payload.panelId); anti-repeat key. */
  stripId?: string
  /** For an archive reprint: the date the strip first ran. */
  firstRan?: string
}

export interface RabbitHole {
  reference: string
  text: string
  why: string
}

export interface RabbitHolesModule {
  type: 'rabbitHoles'
  items: RabbitHole[]
}

export interface GoodNewsItem {
  headline: string
  summary: string
  sourceName: string
  sourceUrl: string
  publishedOn: string
}

export interface GoodNewsModule {
  type: 'goodNews'
  items: GoodNewsItem[]
}

export interface HymnModule {
  type: 'hymn'
  title: string
  author: string
  year: number
  verses: string[][]
}

export interface CatechismModule {
  type: 'catechism'
  number: number
  question: string
  answer: string
  source: string
  scriptures: string[]
}

export interface ArchivePullModule {
  type: 'archivePull'
  slug: string
  title: string
  teaser: string
  seriesSlug: string
  seriesTitle: string
  image: string
}

export interface PlanDayModule {
  type: 'planDay'
  day: number
  title: string
  slug: string
  reference: string
}

export type EditionModule =
  | LeadModule
  | ReadingModule
  | ScriptureModule
  | SceneModule
  | ComicModule
  | RabbitHolesModule
  | GoodNewsModule
  | HymnModule
  | CatechismModule
  | ArchivePullModule
  | PlanDayModule
  | { type: 'word'; word: WordPayload }
  | { type: 'practice'; practice: PracticePayload }
  | { type: 'prayer'; prayer: PrayerPayload }
  | { type: 'redLetter'; saying: RedLetterPayload }
  | { type: 'proverb'; reference: string; text: string; translation: string }
  | { type: 'memoryVerse'; verse: VersePayload }
  | { type: 'question'; question: string }
  | { type: 'voices'; quote: string; author: string; work: string }
  | { type: 'season'; season: SeasonEssayView }
  | { type: 'guides'; guides: (GuidePayload & { slug: string })[] }
  | { type: 'gallery'; plates: GalleryPayload[] }
  | { type: 'crossword'; puzzle: CrosswordPayload }
  | { type: 'unscramble'; puzzle: UnscramblePayload }
  | { type: 'quiz'; questions: QuizPayload[] }
  | { type: 'wordSearch'; puzzle: WordSearchPuzzle }
  | { type: 'coloring'; art: ColoringArt }
  | { type: 'witness'; witness: WitnessPayload }
  | { type: 'screening'; items: ScreeningPayload[] }
  | { type: 'letters'; letters: LetterPayload[] }
  | { type: 'notices'; notices: NoticePayload[] }

export type EditionModuleType = EditionModule['type']

/* ── Composition ─────────────────────────────────────────────────────── */

export type ArchetypeId =
  | 'broadsheet'
  | 'illuminated'
  | 'quiet'
  | 'field-notes'
  | 'red-letter'
  | 'study-table'
  | 'joy'
  | 'prayer-book'

/** A placed module: which module, at what prominence, in which region. */
export interface Placement {
  module: EditionModuleType
  region: 'front' | 'feature' | 'sheet' | 'margin' | 'back'
  span: 'full' | 'wide' | 'half' | 'third' | 'narrow'
  tier: ModuleTier
  /** Index of the band (row) this placement belongs to, in reading order. */
  band: number
  beat: 'dense' | 'open' | 'pause'
}

/**
 * Plan §40: anchors print generally daily; departments rotate; interactives
 * rotate within a small budget.
 */
export type ModuleRole = 'anchor' | 'department' | 'interactive'

/** Plan §41: the presentation beat of one band, read from what it holds. */
export type RhythmBeat =
  | 'immersive'
  | 'brief'
  | 'interactive'
  | 'quiet'
  | 'visual'
  | 'dense'
  | 'playful'
  | 'scriptural'
  | 'longform'
  | 'prayer'

/** What opens the paper, read from the first band actually placed. */
export type HeroVariant = 'lead-with-rail' | 'lead-with-word' | 'lead' | 'scene' | 'scripture' | 'red-letter' | 'prayer'
export type CompositionDensity = 'dense' | 'standard' | 'sparse'
/** How the archetype spends the crimson spot colour and emphasis (design-system/daily-bread-v2.css). */
export type AccentStrategy =
  | 'standard'
  | 'drop-cap'
  | 'none'
  | 'margin-notes'
  | 'red-letter'
  | 'tinted-word'
  | 'bold-funnies'
  | 'rubric-numerals'
/** What divides one piece from the next. */
export type SeparatorStyle = 'ruled-grid' | 'open-front' | 'hairline' | 'dashed-margin'
/** How much the procedural scene moves: full speed, half speed, or the still poster. */
export type MotionLevel = 'full' | 'gentle' | 'still'

export interface CompositionManifest {
  archetype: ArchetypeId
  seed: number
  /** Scroll rhythm (the plan's visualRhythm), one beat per band. */
  rhythm: ('dense' | 'open' | 'pause')[]
  placements: Placement[]
  /** Why this archetype won (anti-repeat scoring), for the archive record. */
  scoring: { archetype: ArchetypeId; score: number }[]
  /*
   * Plan §37, archived with the issue. Absent on editions composed before
   * 2026-09-14; readers fall back to the archetype's definition.
   */
  heroVariant?: HeroVariant
  density?: CompositionDensity
  /** Module types in reading order. */
  moduleOrder?: EditionModuleType[]
  accentStrategy?: AccentStrategy
  separatorStyle?: SeparatorStyle
  motionLevel?: MotionLevel
  /** The scene as printed: which scene, which renderer, which seed (the plan's proceduralPreset/Seed). */
  procedural?: { scene: ProceduralSceneId; renderer: ProceduralRendererId; seed: number }
  rendererVersion?: string
  /** Plan §41: one presentation beat per band, in reading order. */
  beats?: RhythmBeat[]
  /**
   * Plan §40: the day's rotation. `rested` are departments and interactives that
   * were built but not printed today, with how long ago each last printed.
   */
  rotation?: {
    printed: EditionModuleType[]
    rested: { module: EditionModuleType; lastPrintedDaysAgo: number | null }[]
  }
}

/* ── Visual engine ───────────────────────────────────────────────────── */

export type ProceduralSceneId = 'living-water' | 'grain' | 'wilderness-stars'
export type ProceduralRendererId = 'riso' | 'ascii' | 'halftone'

export type ComicSettingId =
  | 'field'
  | 'shore'
  | 'hillside'
  | 'road'
  | 'night'
  | 'room'
  | 'garden'
  | 'boat'

export type ComicFigureId =
  | 'sower'
  | 'shepherd'
  | 'sheep'
  | 'lamp'
  | 'bread'
  | 'fish'
  | 'boat'
  | 'bird'
  | 'tree'
  | 'seed'
  | 'sprout'
  | 'door'
  | 'traveler'
  | 'well'
  | 'star'
  | 'sun'
  | 'wave'

/* ── Assets ──────────────────────────────────────────────────────────── */

export interface AssetRef {
  id: string
  src: string
  width?: number
  height?: number
  alt: string
  kind: 'print' | 'guide-plate' | 'series-hero' | 'generated-plate' | 'strip'
}

export interface AssetManifest {
  leadPlate?: AssetRef
  /** Deterministic SVG poster for the scene, used as its static fallback. */
  scenePoster: { scene: ProceduralSceneId; seed: number }
  og: { title: string; kicker: string; verse?: string; verseRef?: string }
  fallbacks: string[]
}

/* ── Generation provenance ───────────────────────────────────────────── */

export type ProviderId = 'claude-api' | 'claude-cli' | 'openai' | 'gemini' | 'deterministic'

export interface ProviderUsage {
  provider: ProviderId
  model?: string
  task: string
  /** The task prompt's version (plan §27); absent on usage recorded before 2026-09-14. */
  promptVersion?: number
  ok: boolean
  attempts: number
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
  error?: string
}

/** 0 = Claude, 1 = the secondary remote provider, 2 = the deterministic floor (plan §22, §27). */
export type FallbackLevel = 0 | 1 | 2

export interface GenerationProvenance {
  runId: string
  builtAt: string
  /** The first provider the chain tried (not necessarily the writer). */
  primaryProvider: ProviderId
  fallbackProvidersUsed: ProviderId[]
  /*
   * Plan §27, recorded for the editorial frame (the model-written part).
   * Absent on editions built before 2026-09-14 (No. 001, No. 002).
   */
  /** Who wrote the frame. */
  provider?: ProviderId
  model?: string
  promptVersion?: number
  generatedAt?: string
  fallbackLevel?: FallbackLevel
  usage: ProviderUsage[]
  moduleFailures: { module: string; error: string }[]
  assetFallbacks: string[]
  comicLevel: ComicSourceLevel
  /** edition_items rows (reviewed sources) this edition was built from. */
  sourceItemIds: string[]
}

/* ── The edition ─────────────────────────────────────────────────────── */

export interface DailyEdition {
  /** Row identity (daily_bread_editions.id); revisions reference it. */
  id: string
  schemaVersion: number
  editionDate: string
  slug: string
  archiveOrigin: ArchiveOrigin
  volume: number | null
  issue: number | null
  lifecycle: EditionLifecycle
  quality: EditionQuality
  activeRevision: number
  title: string
  deck: string
  primaryScripture: PrimaryScripture
  liturgical: EditionLiturgical
  seed: string
  composition: CompositionManifest
  modules: EditionModule[]
  assets: AssetManifest
  generation: GenerationProvenance
  rendererVersion: string
  supersededReason?: string
  createdAt: string
  readyAt: string | null
  publishedAt: string | null
  updatedAt: string
}

/**
 * One immutable revision of a published edition (daily_bread_edition_revisions).
 * Revision 1 is written at publication; each correction appends the next.
 * The snapshot is the frozen document as it stood at that revision.
 */
export interface EditionRevision {
  editionId: string
  revision: number
  createdAt: string
  reason: string
  snapshot: EditionSnapshot
}

/** What a revision freezes: the document plus its serial identity at the time. */
export type EditionSnapshot = EditionDocument &
  Pick<DailyEdition, 'volume' | 'issue' | 'readyAt' | 'publishedAt'>

/** The document handed to `daily_bread_mark_ready` (no serial fields yet). */
export type EditionDocument = Omit<
  DailyEdition,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'volume'
  | 'issue'
  | 'lifecycle'
  | 'activeRevision'
  | 'readyAt'
  | 'publishedAt'
  | 'supersededReason'
>

export interface ArchiveEntry {
  editionDate: string
  issue: number | null
  volume: number | null
  archiveOrigin: ArchiveOrigin
  title: string
  quality: EditionQuality
  archetype: ArchetypeId
  lifecycle: 'published' | 'superseded'
  /** The feast kept that day, when there is one (archive liturgical indicator). */
  feast?: string
}

export interface PublicationAttempt {
  attemptId?: string
  targetDate: string
  runId: string
  trigger: 'scheduler' | 'manual' | 'backfill' | 'e2e'
  startedAt: string
  completedAt?: string
  lifecycleStage: string
  primaryProvider?: ProviderId
  fallbackProvidersUsed: ProviderId[]
  quality?: EditionQuality
  errors: { stage: string; message: string }[]
  warnings: string[]
  moduleFailures: { module: string; error: string }[]
  assetFallbacks: string[]
  stageTimings: { stage: string; ms: number }[]
  providerUsage: ProviderUsage[]
  estimatedCostUsd: number
  publicationResult?:
    | 'published'
    | 'ready'
    | 'already_published'
    | 'failed'
    | 'skipped'
}
