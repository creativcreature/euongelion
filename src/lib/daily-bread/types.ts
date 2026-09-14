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
 * The comic fallback chain (5 levels). The level is recorded on the module so
 * the archive can show how every day's strip was made.
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
  script?: ComicScript
  image?: { src: string; width: number; height: number; alt: string }
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

export interface CompositionManifest {
  archetype: ArchetypeId
  seed: number
  /** Scroll rhythm, one beat per band: dense / open / pause. */
  rhythm: ('dense' | 'open' | 'pause')[]
  placements: Placement[]
  /** Why this archetype won (anti-repeat scoring), for the archive record. */
  scoring: { archetype: ArchetypeId; score: number }[]
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
  ok: boolean
  attempts: number
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
  error?: string
}

export interface GenerationProvenance {
  runId: string
  builtAt: string
  primaryProvider: ProviderId
  fallbackProvidersUsed: ProviderId[]
  usage: ProviderUsage[]
  moduleFailures: { module: string; error: string }[]
  assetFallbacks: string[]
  comicLevel: ComicSourceLevel
  /** edition_items rows (reviewed sources) this edition was built from. */
  sourceItemIds: string[]
}

/* ── The edition ─────────────────────────────────────────────────────── */

export interface DailyEdition {
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
  readyAt: string | null
  publishedAt: string | null
}

/** The document handed to `daily_bread_mark_ready` (no serial fields yet). */
export type EditionDocument = Omit<
  DailyEdition,
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
