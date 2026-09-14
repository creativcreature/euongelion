/**
 * In-memory repository — mirrors the SQL functions' semantics exactly
 * (lease, mark-ready, transactional numbering, revisions). Used by the
 * orchestrator/scheduler/E2E tests and by local dry runs. Not a cache and not
 * a production fallback: nothing in the reader path ever selects it.
 */
import type {
  ArchiveEntry,
  DailyEdition,
  EditionDocument,
  EditionLifecycle,
  EditionRevision,
  EditionSnapshot,
  PublicationAttempt,
} from '../types'
import {
  recentFromEdition,
  toArchiveEntry,
  type DailyBreadRepository,
  type MarkReadyResult,
  type RecentComposition,
} from './types'

interface Row {
  id: string
  date: string
  lifecycle: EditionLifecycle
  archiveOrigin: 'native' | 'backfilled'
  lockOwner: string | null
  lockExpiresAt: number | null
  document: EditionDocument | null
  issue: number | null
  volume: number | null
  activeRevision: number
  createdAt: string
  readyAt: string | null
  publishedAt: string | null
  updatedAt: string
  supersededReason?: string
}

export interface MemoryRepositoryOptions {
  now?: () => Date
  /** Failure injection: throw from a named method. */
  failOn?: Partial<Record<keyof DailyBreadRepository, Error>>
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export class MemoryDailyBreadRepository implements DailyBreadRepository {
  readonly kind = 'memory' as const
  private rows = new Map<string, Row>()
  private revisions: EditionRevision[] = []
  private attempts: PublicationAttempt[] = []
  private seq = 0
  private readonly now: () => Date
  failOn: Partial<Record<keyof DailyBreadRepository, Error>>

  constructor(options: MemoryRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date())
    this.failOn = options.failOn ?? {}
  }

  private check(method: keyof DailyBreadRepository) {
    const err = this.failOn[method]
    if (err) throw err
  }

  /** Mirrors `updated_at = now()` in every SQL mutation. */
  private touch(row: Row, at: Date = this.now()) {
    row.updatedAt = at.toISOString()
  }

  private toEdition(row: Row): DailyEdition | null {
    if (!row.document) return null
    return clone({
      ...row.document,
      id: row.id,
      volume: row.volume,
      issue: row.issue,
      lifecycle: row.lifecycle,
      activeRevision: row.activeRevision,
      createdAt: row.createdAt,
      readyAt: row.readyAt,
      publishedAt: row.publishedAt,
      updatedAt: row.updatedAt,
      ...(row.supersededReason ? { supersededReason: row.supersededReason } : {}),
    })
  }

  /** Mirrors `daily_bread_edition_document`: the frozen document plus serial identity. */
  private toSnapshot(row: Row): EditionSnapshot | null {
    if (!row.document) return null
    return clone({
      ...row.document,
      volume: row.volume,
      issue: row.issue,
      readyAt: row.readyAt,
      publishedAt: row.publishedAt,
    })
  }

  async acquireAssembly(
    date: string,
    owner: string,
    options: { ttlSeconds?: number; archiveOrigin?: 'native' | 'backfilled' } = {},
  ) {
    this.check('acquireAssembly')
    const ttl = options.ttlSeconds ?? 900
    let row = this.rows.get(date)
    if (!row) {
      const created = this.now().toISOString()
      row = {
        id: `mem-${++this.seq}`,
        date,
        lifecycle: 'draft',
        archiveOrigin: options.archiveOrigin ?? 'native',
        lockOwner: null,
        lockExpiresAt: null,
        document: null,
        issue: null,
        volume: null,
        activeRevision: 0,
        createdAt: created,
        readyAt: null,
        publishedAt: null,
        updatedAt: created,
      }
      this.rows.set(date, row)
    }
    if (['ready', 'published', 'superseded'].includes(row.lifecycle)) {
      return { acquired: false, lifecycle: row.lifecycle, editionId: row.id }
    }
    const nowMs = this.now().getTime()
    if (
      row.lifecycle === 'assembling' &&
      row.lockOwner !== owner &&
      (row.lockExpiresAt ?? 0) > nowMs
    ) {
      return { acquired: false, lifecycle: row.lifecycle, editionId: row.id }
    }
    row.lifecycle = 'assembling'
    row.archiveOrigin = options.archiveOrigin ?? 'native'
    row.lockOwner = owner
    row.lockExpiresAt = nowMs + ttl * 1000
    this.touch(row)
    return { acquired: true, lifecycle: 'assembling' as const, editionId: row.id }
  }

  async releaseAssembly(date: string, owner: string) {
    this.check('releaseAssembly')
    const row = this.rows.get(date)
    if (!row || row.lifecycle !== 'assembling' || row.lockOwner !== owner) return false
    row.lifecycle = 'draft'
    row.lockOwner = null
    row.lockExpiresAt = null
    this.touch(row)
    return true
  }

  async markReady(date: string, owner: string, document: EditionDocument): Promise<MarkReadyResult> {
    this.check('markReady')
    const row = this.rows.get(date)
    if (!row) return 'missing'
    if (row.lifecycle === 'ready' || row.lifecycle === 'published' || row.lifecycle === 'superseded') {
      return `already_${row.lifecycle}` as MarkReadyResult
    }
    if (row.lifecycle !== 'assembling' || row.lockOwner !== owner) return 'lock_lost'
    if (document.editionDate !== date) {
      throw new Error('daily_bread_mark_ready: document date does not match')
    }
    row.document = clone(document)
    row.lifecycle = 'ready'
    row.readyAt = this.now().toISOString()
    row.lockOwner = null
    row.lockExpiresAt = null
    this.touch(row)
    return 'ready'
  }

  async reopenReady(date: string) {
    this.check('reopenReady')
    const row = this.rows.get(date)
    if (!row || row.lifecycle !== 'ready') return false
    row.lifecycle = 'draft'
    row.readyAt = null
    this.touch(row)
    return true
  }

  async publish(date: string, now: Date = this.now()) {
    this.check('publish')
    const row = this.rows.get(date)
    if (!row) return { result: 'missing' as const, issue: null, volume: null }
    if (row.lifecycle === 'published' || row.lifecycle === 'superseded') {
      return { result: 'already_published' as const, issue: row.issue, volume: row.volume }
    }
    if (row.lifecycle !== 'ready') return { result: 'not_ready' as const, issue: null, volume: null }
    if (row.archiveOrigin === 'native') {
      const numbered = [...this.rows.values()].filter(
        (r) => r.archiveOrigin === 'native' && r.issue !== null,
      )
      row.issue = numbered.reduce((m, r) => Math.max(m, r.issue ?? 0), 0) + 1
      const launch = numbered.map((r) => r.date).sort()[0] ?? date
      const years =
        Number(date.slice(0, 4)) -
        Number(launch.slice(0, 4)) -
        (date.slice(5) < launch.slice(5) ? 1 : 0)
      row.volume = 1 + Math.max(0, years)
    }
    row.lifecycle = 'published'
    row.publishedAt = now.toISOString()
    row.activeRevision = 1
    row.lockOwner = null
    row.lockExpiresAt = null
    this.touch(row, now)
    const snapshot = this.toSnapshot(row)
    if (snapshot) {
      this.revisions.push({
        editionId: row.id,
        revision: 1,
        createdAt: now.toISOString(),
        reason: 'initial publication',
        snapshot,
      })
    }
    return { result: 'published' as const, issue: row.issue, volume: row.volume }
  }

  async createRevision(
    date: string,
    reason: string,
    patch: Partial<EditionDocument>,
  ) {
    this.check('createRevision')
    const row = this.rows.get(date)
    if (!row || row.lifecycle !== 'published' || !row.document) {
      return { result: 'not_published' as const, revision: null }
    }
    if (!reason || reason.length > 500) throw new Error('daily_bread_create_revision: reason required')
    row.document = { ...row.document, ...clone(patch) }
    row.activeRevision += 1
    this.touch(row)
    const snapshot = this.toSnapshot(row)
    if (snapshot) {
      this.revisions.push({
        editionId: row.id,
        revision: row.activeRevision,
        createdAt: row.updatedAt,
        reason,
        snapshot,
      })
    }
    return { result: 'revised' as const, revision: row.activeRevision }
  }

  async supersede(date: string, reason: string) {
    this.check('supersede')
    const row = this.rows.get(date)
    if (!row || row.lifecycle !== 'published') return 'not_published' as const
    row.lifecycle = 'superseded'
    row.supersededReason = reason
    this.touch(row)
    return 'superseded' as const
  }

  async getRevisions(date: string) {
    this.check('getRevisions')
    const row = this.rows.get(date)
    if (!row) return []
    return clone(
      this.revisions
        .filter((r) => r.editionId === row.id)
        .sort((a, b) => a.revision - b.revision),
    )
  }

  async getEdition(date: string, options: { includeUnpublished?: boolean } = {}) {
    this.check('getEdition')
    const row = this.rows.get(date)
    if (!row) return null
    const isPublic = row.lifecycle === 'published' || row.lifecycle === 'superseded'
    if (!isPublic && !options.includeUnpublished) return null
    return this.toEdition(row)
  }

  private publicRows(): Row[] {
    return [...this.rows.values()]
      .filter((r) => (r.lifecycle === 'published' || r.lifecycle === 'superseded') && r.document)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }

  async getLatestPublished(onOrBefore: string) {
    this.check('getLatestPublished')
    const candidates = this.publicRows().filter(
      (r) => r.date <= onOrBefore && r.lifecycle === 'published',
    )
    const row = candidates[candidates.length - 1]
    return row ? this.toEdition(row) : null
  }

  async getNeighbors(date: string) {
    this.check('getNeighbors')
    const pub = this.publicRows()
    const prev = [...pub].reverse().find((r) => r.date < date)
    const next = pub.find((r) => r.date > date)
    const entry = (r: Row | undefined): ArchiveEntry | null => {
      const e = r ? this.toEdition(r) : null
      return e ? toArchiveEntry(e) : null
    }
    return { previous: entry(prev), next: entry(next) }
  }

  async listArchive(options: { limit: number; before?: string }) {
    this.check('listArchive')
    return this.publicRows()
      .reverse()
      .filter((r) => !options.before || r.date < options.before)
      .slice(0, options.limit)
      .map((r) => toArchiveEntry(this.toEdition(r) as DailyEdition))
  }

  async recentCompositions(before: string, days: number): Promise<RecentComposition[]> {
    this.check('recentCompositions')
    const floor = new Date(Date.parse(`${before}T00:00:00Z`) - days * 86_400_000)
      .toISOString()
      .slice(0, 10)
    return [...this.rows.values()]
      .filter((r) => r.document && r.date < before && r.date >= floor)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((r) => recentFromEdition(this.toEdition(r) as DailyEdition))
  }

  async getLifecycle(date: string) {
    this.check('getLifecycle')
    return this.rows.get(date)?.lifecycle ?? null
  }

  async recordAttempt(attempt: PublicationAttempt) {
    this.check('recordAttempt')
    this.attempts.push(clone({ ...attempt, attemptId: attempt.attemptId ?? `att-${++this.seq}` }))
  }

  async recentAttempts(limit: number) {
    this.check('recentAttempts')
    return clone(
      [...this.attempts]
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
        .slice(0, limit),
    )
  }

  /**
   * Load an already-published edition as-is (fixture sets, archive imports in
   * tests). Keeps its recorded issue/volume; no numbering is performed.
   */
  seedPublished(
    edition: Omit<DailyEdition, 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<DailyEdition, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    const stamp = edition.publishedAt ?? edition.readyAt ?? this.now().toISOString()
    const row: Row = {
      id: edition.id ?? `mem-${++this.seq}`,
      createdAt: edition.createdAt ?? stamp,
      updatedAt: edition.updatedAt ?? stamp,
      date: edition.editionDate,
      lifecycle: edition.lifecycle,
      archiveOrigin: edition.archiveOrigin,
      lockOwner: null,
      lockExpiresAt: null,
      document: clone({
        schemaVersion: edition.schemaVersion,
        editionDate: edition.editionDate,
        slug: edition.slug,
        archiveOrigin: edition.archiveOrigin,
        quality: edition.quality,
        title: edition.title,
        deck: edition.deck,
        primaryScripture: edition.primaryScripture,
        liturgical: edition.liturgical,
        seed: edition.seed,
        composition: edition.composition,
        modules: edition.modules,
        assets: edition.assets,
        generation: edition.generation,
        rendererVersion: edition.rendererVersion,
      }),
      issue: edition.issue,
      volume: edition.volume,
      activeRevision: edition.activeRevision,
      readyAt: edition.readyAt,
      publishedAt: edition.publishedAt,
      ...(edition.supersededReason ? { supersededReason: edition.supersededReason } : {}),
    }
    this.rows.set(edition.editionDate, row)
  }

  /** Test/inspection helper: the immutable revision log. */
  revisionLog() {
    return clone(this.revisions)
  }

  /** Test helper: expire a lease. */
  expireLease(date: string) {
    const row = this.rows.get(date)
    if (row) row.lockExpiresAt = 0
  }
}
