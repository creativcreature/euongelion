/**
 * Supabase-backed repository (service role). All lifecycle mutations go
 * through the SQL functions so locking and numbering are transactional in the
 * database, not in this process. Read failures THROW — the page renders a
 * visible failure, never a silently empty paper.
 */
import type {
  ArchiveEntry,
  DailyEdition,
  EditionDocument,
  EditionLifecycle,
  EditionRevision,
  PublicationAttempt,
} from '../types'
import type {
  DailyBreadRepository,
  MarkReadyResult,
  PublishResult,
  RecentComposition,
} from './types'
import { errorMessage } from '../redact'

/* The generated Database type predates these tables; the client is typed at
   this boundary and every row is mapped explicitly below. */
export type SupabaseLike = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any }

const EDITION_COLUMNS =
  'id, edition_date, slug, archive_origin, volume, issue, lifecycle, quality, active_revision, title, deck, primary_scripture, liturgical, seed, archetype, composition, modules, assets, generation, schema_version, renderer_version, superseded_reason, created_at, ready_at, published_at, updated_at'

const ARCHIVE_COLUMNS =
  'edition_date, issue, volume, archive_origin, title, quality, archetype, lifecycle'

interface EditionRow {
  id: string
  edition_date: string
  slug: string
  archive_origin: 'native' | 'backfilled'
  volume: number | null
  issue: number | null
  lifecycle: EditionLifecycle
  quality: DailyEdition['quality'] | null
  active_revision: number
  title: string | null
  deck: string | null
  primary_scripture: DailyEdition['primaryScripture'] | null
  liturgical: DailyEdition['liturgical'] | null
  seed: string | null
  archetype: string | null
  composition: DailyEdition['composition'] | null
  modules: DailyEdition['modules'] | null
  assets: DailyEdition['assets'] | null
  generation: DailyEdition['generation'] | null
  schema_version: number
  renderer_version: string | null
  superseded_reason: string | null
  created_at: string
  ready_at: string | null
  published_at: string | null
  updated_at: string
}

function rowToEdition(row: EditionRow): DailyEdition | null {
  if (!row.title || !row.modules || !row.composition || !row.quality) return null
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    editionDate: row.edition_date,
    slug: row.slug,
    archiveOrigin: row.archive_origin,
    volume: row.volume,
    issue: row.issue,
    lifecycle: row.lifecycle,
    quality: row.quality,
    activeRevision: row.active_revision,
    title: row.title,
    deck: row.deck ?? '',
    primaryScripture: row.primary_scripture as DailyEdition['primaryScripture'],
    liturgical: row.liturgical as DailyEdition['liturgical'],
    seed: row.seed ?? '',
    composition: row.composition,
    modules: row.modules,
    assets: row.assets as DailyEdition['assets'],
    generation: row.generation as DailyEdition['generation'],
    rendererVersion: row.renderer_version ?? '',
    ...(row.superseded_reason ? { supersededReason: row.superseded_reason } : {}),
    createdAt: row.created_at,
    readyAt: row.ready_at,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }
}

function rowToArchive(row: {
  edition_date: string
  issue: number | null
  volume: number | null
  archive_origin: 'native' | 'backfilled'
  title: string
  quality: ArchiveEntry['quality']
  archetype: ArchiveEntry['archetype']
  lifecycle: 'published' | 'superseded'
}): ArchiveEntry {
  return {
    editionDate: row.edition_date,
    issue: row.issue,
    volume: row.volume,
    archiveOrigin: row.archive_origin,
    title: row.title,
    quality: row.quality,
    archetype: row.archetype,
    lifecycle: row.lifecycle,
  }
}

function fail(op: string, error: { message?: string } | null | undefined): never {
  throw new Error(`daily-bread ${op} failed: ${errorMessage(error?.message ?? 'unknown')}`)
}

type ReadResult = { data: unknown; error: { message?: string; code?: string } | null }

/** Upstream hiccups worth one or two quick retries (a real 504 hit the first CI run). */
export function isTransientReadError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  return /gateway|timeout|timed out|fetch failed|network|econnreset|socket|502|503|504|service unavailable/i.test(
    `${error.code ?? ''} ${error.message ?? ''}`,
  )
}

export class SupabaseDailyBreadRepository implements DailyBreadRepository {
  readonly kind = 'supabase' as const
  constructor(
    private readonly client: SupabaseLike,
    private readonly readRetry: { attempts: number; delayMs: number } = { attempts: 3, delayMs: 400 },
  ) {}

  /**
   * Reads only: build a FRESH query per attempt (a PostgREST builder re-sends on
   * each await) and retry transient upstream errors. Writes are never retried
   * here — a write whose response was lost may already have landed.
   */
  private async read<T extends ReadResult>(make: () => PromiseLike<T>): Promise<T> {
    let last: T | null = null
    for (let attempt = 1; attempt <= this.readRetry.attempts; attempt++) {
      try {
        last = await make()
      } catch (thrown) {
        last = { data: null, error: { message: errorMessage(thrown) } } as T
      }
      if (!last.error || !isTransientReadError(last.error) || attempt === this.readRetry.attempts) return last
      await new Promise((r) => setTimeout(r, this.readRetry.delayMs * attempt))
    }
    return last as T
  }

  async acquireAssembly(
    date: string,
    owner: string,
    options: { ttlSeconds?: number; archiveOrigin?: 'native' | 'backfilled' } = {},
  ) {
    const { data, error } = await this.client.rpc('daily_bread_acquire_assembly', {
      p_date: date,
      p_owner: owner,
      p_ttl_seconds: options.ttlSeconds ?? 900,
      p_archive_origin: options.archiveOrigin ?? 'native',
    })
    if (error) fail('acquire_assembly', error)
    const row = (Array.isArray(data) ? data[0] : data) as
      | { acquired: boolean; lifecycle: EditionLifecycle; edition_id: string }
      | undefined
    if (!row) fail('acquire_assembly', { message: 'no row returned' })
    return { acquired: row.acquired, lifecycle: row.lifecycle, editionId: row.edition_id }
  }

  async releaseAssembly(date: string, owner: string) {
    const { data, error } = await this.client.rpc('daily_bread_release_assembly', {
      p_date: date,
      p_owner: owner,
    })
    if (error) fail('release_assembly', error)
    return data === true
  }

  async markReady(date: string, owner: string, document: EditionDocument) {
    const { data, error } = await this.client.rpc('daily_bread_mark_ready', {
      p_date: date,
      p_owner: owner,
      p_document: document,
    })
    if (error) fail('mark_ready', error)
    return data as MarkReadyResult
  }

  async reopenReady(date: string) {
    const { data, error } = await this.client.rpc('daily_bread_reopen_ready', { p_date: date })
    if (error) fail('reopen_ready', error)
    return data === true
  }

  async publish(date: string, now?: Date) {
    const { data, error } = await this.client.rpc('daily_bread_publish', {
      p_date: date,
      ...(now ? { p_now: now.toISOString() } : {}),
    })
    if (error) fail('publish', error)
    const row = (Array.isArray(data) ? data[0] : data) as
      | { result: PublishResult; issue: number | null; volume: number | null }
      | undefined
    if (!row) fail('publish', { message: 'no row returned' })
    return { result: row.result, issue: row.issue, volume: row.volume }
  }

  async createRevision(date: string, reason: string, patch: Partial<EditionDocument>) {
    const { data, error } = await this.client.rpc('daily_bread_create_revision', {
      p_date: date,
      p_reason: reason,
      p_document: patch,
    })
    if (error) fail('create_revision', error)
    const row = (Array.isArray(data) ? data[0] : data) as
      | { result: 'revised' | 'not_published'; revision: number | null }
      | undefined
    return { result: row?.result ?? 'not_published', revision: row?.revision ?? null }
  }

  async supersede(date: string, reason: string) {
    const { data, error } = await this.client.rpc('daily_bread_supersede', {
      p_date: date,
      p_reason: reason,
    })
    if (error) fail('supersede', error)
    return data as 'superseded' | 'not_published'
  }

  async getEdition(date: string, options: { includeUnpublished?: boolean } = {}) {
    const { data, error } = await this.read(() => {
      let query = this.client.from('daily_bread_editions').select(EDITION_COLUMNS).eq('edition_date', date)
      if (!options.includeUnpublished) {
        query = query.in('lifecycle', ['published', 'superseded'])
      }
      return query.maybeSingle()
    })
    if (error) fail('read edition', error)
    return data ? rowToEdition(data as EditionRow) : null
  }

  async getLatestPublished(onOrBefore: string) {
    const { data, error } = await this.read(() =>
      this.client
        .from('daily_bread_editions')
        .select(EDITION_COLUMNS)
        .eq('lifecycle', 'published')
        .lte('edition_date', onOrBefore)
        .order('edition_date', { ascending: false })
        .limit(1),
    )
    if (error) fail('read latest edition', error)
    const row = (data as EditionRow[] | null)?.[0]
    return row ? rowToEdition(row) : null
  }

  async getNeighbors(date: string) {
    const [prev, next] = await Promise.all([
      this.read(() =>
        this.client
          .from('daily_bread_editions')
          .select(ARCHIVE_COLUMNS)
          .in('lifecycle', ['published', 'superseded'])
          .lt('edition_date', date)
          .order('edition_date', { ascending: false })
          .limit(1),
      ),
      this.read(() =>
        this.client
          .from('daily_bread_editions')
          .select(ARCHIVE_COLUMNS)
          .in('lifecycle', ['published', 'superseded'])
          .gt('edition_date', date)
          .order('edition_date', { ascending: true })
          .limit(1),
      ),
    ])
    if (prev.error) fail('read previous edition', prev.error)
    if (next.error) fail('read next edition', next.error)
    const prevRows = prev.data as Parameters<typeof rowToArchive>[0][] | null
    const nextRows = next.data as Parameters<typeof rowToArchive>[0][] | null
    return {
      previous: prevRows?.[0] ? rowToArchive(prevRows[0]) : null,
      next: nextRows?.[0] ? rowToArchive(nextRows[0]) : null,
    }
  }

  async listArchive(options: { limit: number; before?: string }) {
    const { data, error } = await this.read(() => {
      let query = this.client
        .from('daily_bread_editions')
        .select(ARCHIVE_COLUMNS)
        .in('lifecycle', ['published', 'superseded'])
        .order('edition_date', { ascending: false })
        .limit(Math.min(Math.max(1, options.limit), 100))
      if (options.before) query = query.lt('edition_date', options.before)
      return query
    })
    if (error) fail('read archive', error)
    return ((data ?? []) as Parameters<typeof rowToArchive>[0][]).map(rowToArchive)
  }

  async recentCompositions(before: string, days: number): Promise<RecentComposition[]> {
    const floor = new Date(Date.parse(`${before}T00:00:00Z`) - days * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const { data, error } = await this.read(() =>
      this.client
        .from('daily_bread_editions')
        .select('edition_date, archetype, modules, assets')
        .in('lifecycle', ['ready', 'published', 'superseded'])
        .lt('edition_date', before)
        .gte('edition_date', floor)
        .order('edition_date', { ascending: false }),
    )
    if (error) fail('read recent compositions', error)
    return ((data ?? []) as {
      edition_date: string
      archetype: RecentComposition['archetype']
      modules: DailyEdition['modules'] | null
      assets: DailyEdition['assets'] | null
    }[]).map((r) => {
      const scene = r.modules?.find((m) => m.type === 'scene')
      const comic = r.modules?.find((m) => m.type === 'comic')
      return {
        editionDate: r.edition_date,
        archetype: r.archetype,
        scene: scene && scene.type === 'scene' ? scene.scene : undefined,
        comicId: comic && comic.type === 'comic' ? comic.script?.id : undefined,
        leadPlateId: r.assets?.leadPlate?.id,
      }
    })
  }

  async getLifecycle(date: string) {
    const { data, error } = await this.read(() =>
      this.client.from('daily_bread_editions').select('lifecycle').eq('edition_date', date).maybeSingle(),
    )
    if (error) fail('read lifecycle', error)
    return ((data as { lifecycle?: EditionLifecycle } | null)?.lifecycle as EditionLifecycle | undefined) ?? null
  }

  async getRevisions(date: string) {
    const { data: edition, error: editionError } = await this.read(() =>
      this.client.from('daily_bread_editions').select('id').eq('edition_date', date).maybeSingle(),
    )
    if (editionError) fail('read edition id', editionError)
    const id = (edition as { id?: string } | null)?.id
    if (!id) return []
    const { data, error } = await this.read(() =>
      this.client
        .from('daily_bread_edition_revisions')
        .select('edition_id, revision, created_at, reason, snapshot')
        .eq('edition_id', id)
        .order('revision', { ascending: true }),
    )
    if (error) fail('read revisions', error)
    return ((data ?? []) as {
      edition_id: string
      revision: number
      created_at: string
      reason: string
      snapshot: EditionRevision['snapshot']
    }[]).map((r) => ({
      editionId: r.edition_id,
      revision: r.revision,
      createdAt: r.created_at,
      reason: r.reason,
      snapshot: r.snapshot,
    }))
  }

  async recordAttempt(attempt: PublicationAttempt) {
    const { error } = await this.client.from('daily_bread_publication_attempts').insert({
      target_date: attempt.targetDate,
      run_id: attempt.runId,
      trigger: attempt.trigger,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt ?? null,
      lifecycle_stage: attempt.lifecycleStage,
      primary_provider: attempt.primaryProvider ?? null,
      fallback_providers_used: attempt.fallbackProvidersUsed,
      quality: attempt.quality ?? null,
      errors: attempt.errors,
      warnings: attempt.warnings,
      module_failures: attempt.moduleFailures,
      asset_fallbacks: attempt.assetFallbacks,
      stage_timings: attempt.stageTimings,
      provider_usage: attempt.providerUsage,
      estimated_cost_usd: Number(attempt.estimatedCostUsd.toFixed(5)),
      publication_result: attempt.publicationResult ?? null,
    })
    if (error) fail('record attempt', error)
  }

  async recentAttempts(limit: number) {
    const { data, error } = await this.read(() =>
      this.client
        .from('daily_bread_publication_attempts')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(Math.min(Math.max(1, limit), 200)),
    )
    if (error) fail('read attempts', error)
    return ((data ?? []) as Record<string, unknown>[]).map(
      (r): PublicationAttempt => ({
        attemptId: r.attempt_id as string,
        targetDate: r.target_date as string,
        runId: r.run_id as string,
        trigger: r.trigger as PublicationAttempt['trigger'],
        startedAt: r.started_at as string,
        completedAt: (r.completed_at as string | null) ?? undefined,
        lifecycleStage: r.lifecycle_stage as string,
        primaryProvider: (r.primary_provider as PublicationAttempt['primaryProvider']) ?? undefined,
        fallbackProvidersUsed: (r.fallback_providers_used as PublicationAttempt['fallbackProvidersUsed']) ?? [],
        quality: (r.quality as PublicationAttempt['quality']) ?? undefined,
        errors: (r.errors as PublicationAttempt['errors']) ?? [],
        warnings: (r.warnings as string[]) ?? [],
        moduleFailures: (r.module_failures as PublicationAttempt['moduleFailures']) ?? [],
        assetFallbacks: (r.asset_fallbacks as string[]) ?? [],
        stageTimings: (r.stage_timings as PublicationAttempt['stageTimings']) ?? [],
        providerUsage: (r.provider_usage as PublicationAttempt['providerUsage']) ?? [],
        estimatedCostUsd: Number(r.estimated_cost_usd ?? 0),
        publicationResult: (r.publication_result as PublicationAttempt['publicationResult']) ?? undefined,
      }),
    )
  }
}
