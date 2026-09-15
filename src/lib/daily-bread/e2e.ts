/**
 * End-to-end publication check, fully in memory (SA-142 / F-184): real module
 * builders over the committed corpus, the real orchestrator and scheduler, a
 * memory repository with the SQL functions' semantics, and a fixed clock
 * walking across two rollovers. No network, no credentials — runnable in CI.
 *
 * Also runs the TOTAL AI OUTAGE scenario: every provider configured but
 * failing. The paper must still publish, numbered, marked as a fallback
 * edition, with the failures recorded.
 */
import { bsbLookup, defaultEditionSources, type EditionSources } from './modules/build'
import { createRunLogger, type RunLogger } from './log'
import { createDailyBreadEdition, runDailyBread, type PipelineDeps } from './orchestrator'
import { MemoryDailyBreadRepository } from './repository/memory'
import { ProviderError, type TextProvider } from './providers/types'
import { fixedClock, type EditorialClock } from './time'
import { validateEditionDocument } from './validate'
import { loadArchiveMonth, loadEditionForDate, loadLiveEdition } from './read'

export interface E2ECheck {
  name: string
  ok: boolean
  detail?: string
}

export interface E2EReport {
  ok: boolean
  checks: E2ECheck[]
}

export function offlineSources(): EditionSources {
  const s = defaultEditionSources()
  s.liveEditionItems = async () => ({})
  s.generatedLeadArt = async () => null
  s.lookupVerse = bsbLookup
  // Offline there is no strip bank: the comic is honestly omitted.
  s.publishedStrips = async () => []
  s.assetAvailable = async () => false
  // Devotional threads read the committed corpus from disk: no network.
  return s
}

export function failingProvider(id: TextProvider['id'], message = 'HTTP 503'): TextProvider {
  return {
    id,
    model: `${id}-test`,
    available: () => true,
    async generate() {
      throw new ProviderError(`${id}: ${message}`, { retryable: true })
    },
  }
}

export async function runInMemoryE2E(options: { logger?: RunLogger } = {}): Promise<E2EReport> {
  const checks: E2ECheck[] = []
  const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail })
  const repo = new MemoryDailyBreadRepository()
  let clock: EditorialClock = fixedClock('2026-09-13T23:00:00Z')
  const sleep = async () => {}

  const deps = (logger: RunLogger): PipelineDeps => ({
    repo,
    sources: offlineSources(),
    providers: [failingProvider('claude-api'), failingProvider('gemini')],
    clock,
    logger,
    trigger: 'e2e',
    providerTimeoutMs: 2_000,
    providerRetries: 1,
    sleep,
  })
  const logger = (tag: string) =>
    options.logger ?? createRunLogger(`e2e-${tag}`, { sink: () => {} })

  // 1. Evening of Sep 13 (NY): today's paper is missing → emergency build +
  //    publish; tomorrow is inside the build window → built ready.
  const first = await runDailyBread(deps(logger('1')))
  check('run 1: live paper published', first.ok, JSON.stringify(first.actions))
  check('run 1: live issue is No. 1', (await repo.getEdition('2026-09-13'))?.issue === 1)
  check('run 1: tomorrow built ready', (await repo.getLifecycle('2026-09-14')) === 'ready')

  // 2. After Sep 14 rollover (07:05 EDT = 11:05Z): publish tomorrow's paper.
  clock = fixedClock('2026-09-14T11:05:00Z')
  const second = await runDailyBread(deps(logger('2')))
  const sep14 = await repo.getEdition('2026-09-14')
  check('run 2: Sep 14 published as No. 2', sep14?.issue === 2, JSON.stringify(second.actions))

  // 3. Idempotency: a duplicate run at the same instant changes nothing.
  await runDailyBread(deps(logger('3')))
  check('run 3: duplicate run allocates no new issue', (await repo.getEdition('2026-09-14'))?.issue === 2)
  check('run 3: one revision per published edition', repo.revisionLog().length === 2)

  // 4. Concurrent build of the same date: exactly one assembles.
  clock = fixedClock('2026-09-14T23:30:00Z')
  const [a, b] = await Promise.all([
    createDailyBreadEdition('2026-09-15', deps(logger('4a'))),
    createDailyBreadEdition('2026-09-15', deps(logger('4b'))),
  ])
  const results = [a.result, b.result].sort()
  check('run 4: concurrent builds → one ready, one skipped', results.join(',') === 'ready,skipped', results.join(','))

  // 5. Before rollover nothing publishes early.
  clock = fixedClock('2026-09-15T10:55:00Z')
  await runDailyBread(deps(logger('5')))
  check('run 5: no publication before 7am ET', (await repo.getLifecycle('2026-09-15')) === 'ready')

  // 6. After rollover: No. 3.
  clock = fixedClock('2026-09-15T11:10:00Z')
  await runDailyBread(deps(logger('6')))
  const sep15 = await repo.getEdition('2026-09-15')
  check('run 6: Sep 15 published as No. 3', sep15?.issue === 3)

  // Plan §83: retrieve the issue the way the routes do — the dated URL's loader
  // and the archive's — and confirm the number, the modules, and no draft leak.
  clock = fixedClock('2026-09-15T23:30:00Z')
  await createDailyBreadEdition('2026-09-16', deps(logger('7'))) // tomorrow, ready but unpublished
  const dated = await loadEditionForDate('2026-09-15', repo)
  check('dated URL: /daily-bread/2026-09-15 resolves to No. 3', dated?.edition.issue === 3)
  check(
    'dated URL: the issue carries its Scripture, reading and printed modules',
    Boolean(dated && ['scripture', 'reading'].every((t) => dated.edition.modules.some((m) => m.type === t)) &&
      dated.edition.composition.placements.every((p) => dated.edition.modules.some((m) => m.type === p.module))),
  )
  const month = await loadArchiveMonth('2026-09', repo)
  check(
    'archive: September lists Nos. 1–3 in date order',
    month.entries.map((e) => `${e.editionDate}:${e.issue}`).join(',') === '2026-09-13:1,2026-09-14:2,2026-09-15:3',
    month.entries.map((e) => `${e.editionDate}:${e.issue}`).join(','),
  )
  check('no draft leak: the ready Sep 16 has no dated page', (await loadEditionForDate('2026-09-16', repo)) === null)
  check('no draft leak: the archive does not list Sep 16', !month.entries.some((e) => e.editionDate === '2026-09-16'))
  const live = await loadLiveEdition(fixedClock('2026-09-16T10:00:00Z'), repo)
  check('no draft leak: before 7am Sep 16 the live paper is Sep 15', live.edition?.editionDate === '2026-09-15')

  // Total AI outage: every provider failed, yet every paper published.
  for (const date of ['2026-09-13', '2026-09-14', '2026-09-15']) {
    const e = await repo.getEdition(date)
    if (!e) {
      check(`outage: ${date} exists`, false)
      continue
    }
    const { volume, issue, lifecycle, activeRevision, readyAt, publishedAt, supersededReason, ...doc } = e
    void volume, issue, lifecycle, activeRevision, readyAt, publishedAt, supersededReason
    check(`outage: ${date} is a fallback edition`, e.quality === 'fallback', e.quality)
    check(`outage: ${date} frame fell to deterministic`, e.generation.fallbackProvidersUsed.includes('deterministic'))
    check(`outage: ${date} provider failures recorded`, e.generation.usage.some((u) => !u.ok))
    // The funnies are Echo & Dust or nothing: offline there is no strip bank,
    // so the comic is omitted — never a stand-in drawing.
    check(
      `outage: ${date} comic is Echo & Dust or omitted, never a stand-in`,
      e.modules.every((m) => m.type !== 'comic' || (Boolean(m.image && m.stripId) && !m.script)) &&
        e.modules.some((m) => m.type === 'comic') === (e.generation.comicLevel !== 'omitted'),
    )
    check(`outage: ${date} document validates`, validateEditionDocument(doc).length === 0, validateEditionDocument(doc).join('; '))
    // Plan §85, item by item.
    const placed = new Set(e.composition.placements.map((p) => p.module))
    check(`outage: ${date} has Scripture`, placed.has('scripture') && Boolean(e.primaryScripture.text))
    check(`outage: ${date} has its reading from approved sources`, placed.has('reading') && e.modules.some((m) => m.type === 'reading' && m.blocks.length > 0))
    check(`outage: ${date} has a prayer or spiritual response`, placed.has('prayer') || placed.has('practice'))
    check(`outage: ${date} has an intentional visual`, placed.has('scene') && Boolean(e.assets.scenePoster.scene))
    check(`outage: ${date} has a dated URL`, (await loadEditionForDate(date, repo))?.edition.editionDate === date)
    const entries = (await loadArchiveMonth(date.slice(0, 7), repo)).entries
    check(`outage: ${date} has an archive entry`, entries.some((x) => x.editionDate === date && x.issue === e.issue))
  }

  const neighbors = await repo.getNeighbors('2026-09-14')
  check(
    'navigation: previous/next resolve',
    neighbors.previous?.editionDate === '2026-09-13' && neighbors.next?.editionDate === '2026-09-15',
  )
  const archetypes = new Set(
    (await Promise.all(['2026-09-13', '2026-09-14', '2026-09-15'].map((d) => repo.getEdition(d)))).map(
      (e) => e?.composition.archetype,
    ),
  )
  check('composition: no archetype repeats on consecutive days', archetypes.size >= 2, [...archetypes].join(','))
  const attempts = await repo.recentAttempts(50)
  check('attempts: every run recorded', attempts.length >= 6, String(attempts.length))

  return { ok: checks.every((c) => c.ok), checks }
}
