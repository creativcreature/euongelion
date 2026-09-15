import type {
  ArchetypeId,
  ArchiveEntry,
  ArchiveOrigin,
  DailyEdition,
  EditionDocument,
  EditionLifecycle,
  EditionModuleType,
  EditionRevision,
  ProceduralSceneId,
  PublicationAttempt,
} from '../types'

export type MarkReadyResult =
  | 'ready'
  | 'lock_lost'
  | 'missing'
  | 'already_ready'
  | 'already_published'
  | 'already_superseded'

export interface ArchiveListOptions {
  limit: number
  /** Exclusive upper bound (YYYY-MM-DD). */
  before?: string
  /** Inclusive lower bound (YYYY-MM-DD). */
  onOrAfter?: string
}

export type PublishResult ='published' | 'already_published' | 'not_ready' | 'missing'

export interface RecentComposition {
  editionDate: string
  archetype: ArchetypeId
  scene?: ProceduralSceneId
  comicId?: string
  leadPlateId?: string
  /** The module types the paper actually printed (its placements), for department rotation. */
  printed?: EditionModuleType[]
}

/**
 * The only door to Daily Bread V2 persistence. The SQL functions in
 * supabase/migrations/20260913000001_daily_bread_v2.sql are the source of
 * truth for lifecycle semantics; the memory implementation mirrors them for
 * orchestrator tests, and the PGlite suite pins the SQL itself.
 */
export interface DailyBreadRepository {
  readonly kind: 'supabase' | 'memory' | 'fixture'

  acquireAssembly(
    date: string,
    owner: string,
    options?: { ttlSeconds?: number; archiveOrigin?: ArchiveOrigin },
  ): Promise<{ acquired: boolean; lifecycle: EditionLifecycle; editionId: string }>
  releaseAssembly(date: string, owner: string): Promise<boolean>
  markReady(date: string, owner: string, document: EditionDocument): Promise<MarkReadyResult>
  /** Ready → draft (never touches a published edition). */
  reopenReady(date: string): Promise<boolean>
  publish(
    date: string,
    now?: Date,
  ): Promise<{ result: PublishResult; issue: number | null; volume: number | null }>
  createRevision(
    date: string,
    reason: string,
    patch: Partial<Pick<EditionDocument, 'title' | 'deck' | 'quality' | 'modules' | 'composition' | 'assets' | 'generation'>>,
  ): Promise<{ result: 'revised' | 'not_published'; revision: number | null }>
  supersede(date: string, reason: string): Promise<'superseded' | 'not_published'>

  /** Public read: published or superseded only, unless includeUnpublished. */
  getEdition(date: string, options?: { includeUnpublished?: boolean }): Promise<DailyEdition | null>
  getLatestPublished(onOrBefore: string): Promise<DailyEdition | null>
  getNeighbors(date: string): Promise<{ previous: ArchiveEntry | null; next: ArchiveEntry | null }>
  /** Published/withdrawn entries, newest first, within [onOrAfter, before). */
  listArchive(options: ArchiveListOptions): Promise<ArchiveEntry[]>
  recentCompositions(before: string, days: number): Promise<RecentComposition[]>
  getLifecycle(date: string): Promise<EditionLifecycle | null>
  /** Internal read (service role): every immutable revision of an edition, oldest first. */
  getRevisions(date: string): Promise<EditionRevision[]>

  recordAttempt(attempt: PublicationAttempt): Promise<void>
  recentAttempts(limit: number): Promise<PublicationAttempt[]>
}

export function toArchiveEntry(edition: DailyEdition): ArchiveEntry {
  return {
    editionDate: edition.editionDate,
    issue: edition.issue,
    volume: edition.volume,
    archiveOrigin: edition.archiveOrigin,
    title: edition.title,
    quality: edition.quality,
    archetype: edition.composition.archetype,
    lifecycle: edition.lifecycle === 'superseded' ? 'superseded' : 'published',
    ...(edition.liturgical?.feast ? { feast: edition.liturgical.feast } : {}),
  }
}

export function recentFromEdition(edition: DailyEdition): RecentComposition {
  const scene = edition.modules.find((m) => m.type === 'scene')
  const comic = edition.modules.find((m) => m.type === 'comic')
  return {
    editionDate: edition.editionDate,
    archetype: edition.composition.archetype,
    scene: scene && scene.type === 'scene' ? scene.scene : undefined,
    comicId: comic && comic.type === 'comic' ? (comic.stripId ?? comic.script?.id) : undefined,
    leadPlateId: edition.assets.leadPlate?.id,
    printed: edition.composition.placements.map((p) => p.module),
  }
}
