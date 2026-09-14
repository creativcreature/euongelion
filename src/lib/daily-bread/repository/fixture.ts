/**
 * Read-only fixture repository for local Workers preview and visual QA
 * (DAILY_BREAD_V2_SOURCE=fixture). The fixture set is a build artefact written
 * by `npm run daily-bread -- fixtures` — real editions built by the real
 * pipeline — and is NEVER committed or deployed:
 *
 *   Node (next dev):   .daily-bread-local/fixtures.json   (gitignored)
 *   Workers preview:   .open-next/assets/__daily-bread-fixtures/fixtures.json
 *                      (copied in after the OpenNext build; a fresh
 *                      `npm run deploy` rebuilds .open-next without it)
 *
 * Every write method throws: a fixture source can never publish anything.
 */
import type { DailyEdition, PublicationAttempt } from '../types'
import { MemoryDailyBreadRepository } from './memory'
import type { DailyBreadRepository } from './types'

const ASSET_PATH = '__daily-bread-fixtures/fixtures.json'

interface FixtureSet {
  generatedAt: string
  editions: DailyEdition[]
}

async function loadFixtureSet(): Promise<FixtureSet> {
  let raw: string | null = null
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const assets = (env as { ASSETS?: { fetch: (u: string) => Promise<Response> } })?.ASSETS
    if (assets) {
      const res = await assets.fetch(`https://assets.local/${ASSET_PATH}`)
      if (res.ok) raw = await res.text()
    }
  } catch {
    // Not running on Workers — try the local file next.
  }
  if (raw === null) {
    try {
      const { promises: fs } = await import('node:fs')
      const path = await import('node:path')
      raw = await fs.readFile(path.join(process.cwd(), '.daily-bread-local', 'fixtures.json'), 'utf8')
    } catch {
      // Reported below.
    }
  }
  if (raw === null) {
    throw new Error(
      'Daily Bread fixture set not found. Run `npm run daily-bread -- fixtures` first (DAILY_BREAD_V2_SOURCE=fixture).',
    )
  }
  const parsed = JSON.parse(raw) as FixtureSet
  if (!Array.isArray(parsed.editions)) {
    throw new Error('Daily Bread fixture set is malformed (no editions array).')
  }
  return parsed
}

function readOnly(method: string): never {
  throw new Error(`fixture repository is read-only (${method})`)
}

export class FixtureDailyBreadRepository implements DailyBreadRepository {
  readonly kind = 'fixture' as const
  private inner: Promise<MemoryDailyBreadRepository> | null = null

  constructor(private readonly loader: () => Promise<FixtureSet> = loadFixtureSet) {}

  private repo(): Promise<MemoryDailyBreadRepository> {
    if (!this.inner) {
      this.inner = this.loader().then((set) => {
        const mem = new MemoryDailyBreadRepository()
        for (const e of set.editions) mem.seedPublished(e)
        return mem
      })
      this.inner.catch(() => {
        this.inner = null
      })
    }
    return this.inner
  }

  acquireAssembly(): never {
    return readOnly('acquireAssembly')
  }
  releaseAssembly(): never {
    return readOnly('releaseAssembly')
  }
  markReady(): never {
    return readOnly('markReady')
  }
  reopenReady(): never {
    return readOnly('reopenReady')
  }
  publish(): never {
    return readOnly('publish')
  }
  createRevision(): never {
    return readOnly('createRevision')
  }
  supersede(): never {
    return readOnly('supersede')
  }
  recordAttempt(_attempt: PublicationAttempt): never {
    return readOnly('recordAttempt')
  }

  async getEdition(date: string, options?: { includeUnpublished?: boolean }) {
    return (await this.repo()).getEdition(date, options)
  }
  async getLatestPublished(onOrBefore: string) {
    return (await this.repo()).getLatestPublished(onOrBefore)
  }
  async getNeighbors(date: string) {
    return (await this.repo()).getNeighbors(date)
  }
  async listArchive(options: { limit: number; before?: string }) {
    return (await this.repo()).listArchive(options)
  }
  async recentCompositions(before: string, days: number) {
    return (await this.repo()).recentCompositions(before, days)
  }
  async getLifecycle(date: string) {
    return (await this.repo()).getLifecycle(date)
  }
  async getRevisions(date: string) {
    return (await this.repo()).getRevisions(date)
  }
  async recentAttempts(limit: number) {
    return (await this.repo()).recentAttempts(limit)
  }
}
