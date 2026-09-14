/**
 * The Daily Bread V2 pipeline (SA-142 / F-184).
 *
 *   createDailyBreadEdition   lease → build modules → editorial frame (provider
 *                             chain) → comic chain → scene → composition →
 *                             validate → mark ready
 *   publishDailyBreadEdition  rollover reached? → sources still approved? →
 *                             atomic publish (issue allocated in the database)
 *   runDailyBread             the scheduler step: publish what is due, build
 *                             what is next, and if the live paper is missing at
 *                             rollover, build and publish it now
 *
 * Every call writes one PublicationAttempt, success or failure. Nothing here
 * ever runs on a reader request.
 */
import type { Edition } from '@/lib/edition/store'
import { composeFrame, type EditorialFrame, type FrameInput } from './generate/frame'
import { composeComic } from './comic/chain'
import { composeEdition } from './composition/compose'
import { buildBaseEdition, type EditionSources } from './modules/build'
import type { RunLogger } from './log'
import { editionSeed, hashString } from './prng'
import { errorMessage } from './redact'
import type { DailyBreadRepository } from './repository/types'
import type { TextProvider } from './providers/types'
import { finishAttempt, newAttempt as baseNewAttempt, publishDailyBreadEdition } from './publish'
import { schedulePlan, slugToUtcDate, type EditorialClock } from './time'
import {
  DAILY_BREAD_RENDERER_VERSION,
  DAILY_BREAD_SCHEMA_VERSION,
  type ArchiveOrigin,
  type ComicSourceLevel,
  type EditionDocument,
  type EditionModule,
  type EditionQuality,
  type ProviderId,
  type ProviderUsage,
  type PublicationAttempt,
} from './types'
import { validateEditionDocument } from './validate'

export type GenerationPolicy = 'full' | 'deterministic-only'

export interface PipelineDeps {
  repo: DailyBreadRepository
  sources: EditionSources
  providers: TextProvider[]
  clock: EditorialClock
  logger: RunLogger
  trigger: PublicationAttempt['trigger']
  policy?: GenerationPolicy
  providerTimeoutMs?: number
  providerRetries?: number
  sleep?: (ms: number) => Promise<void>
  /** Returns the subset of edition_items ids that are now rejected. */
  rejectedSourceItems?: (ids: string[]) => Promise<string[]>
  leaseSeconds?: number
}

export interface CreateOutcome {
  result: 'ready' | 'skipped' | 'failed'
  reason?: string
  quality?: EditionQuality
  document?: EditionDocument
}

export type { PublishOutcome } from './publish'
export { publishDailyBreadEdition } from './publish'

const NON_CORE_MODULES = new Set<EditionModule['type']>([
  'practice', 'word', 'prayer', 'redLetter', 'proverb', 'memoryVerse', 'question', 'voices',
  'season', 'hymn', 'catechism', 'archivePull', 'planDay', 'guides', 'gallery', 'crossword',
  'unscramble', 'quiz', 'wordSearch', 'coloring',
])

const newAttempt = baseNewAttempt
const finish = finishAttempt

/**
 * Quality is decided by what actually happened relative to the policy:
 *  minimum  — no reading/lead, or at least half of the standing/play modules failed
 *  fallback — the frame fell to deterministic under a 'full' policy, the
 *             primary Scripture came from the weekly verse, the comic fell to a
 *             reprint/omission, or any module failed
 *  normal   — otherwise
 */
export function decideQuality(input: {
  policy: GenerationPolicy
  frameDeterministic: boolean
  comicLevel: ComicSourceLevel
  scriptureSource: 'lead' | 'devotional' | 'weekly-verse'
  hasLead: boolean
  hasReading: boolean
  failedModules: string[]
}): EditionQuality {
  const failedNonCore = input.failedModules.filter((m) => NON_CORE_MODULES.has(m as EditionModule['type']))
  if (!input.hasLead || !input.hasReading || failedNonCore.length >= NON_CORE_MODULES.size / 2) {
    return 'minimum'
  }
  if (
    (input.policy === 'full' && input.frameDeterministic) ||
    input.scriptureSource === 'weekly-verse' ||
    input.comicLevel === 'archive-reprint' ||
    input.comicLevel === 'omitted' ||
    input.failedModules.length > 0
  ) {
    return 'fallback'
  }
  return 'normal'
}

export async function createDailyBreadEdition(
  dateSlug: string,
  deps: PipelineDeps,
  options: { archiveOrigin?: ArchiveOrigin } = {},
): Promise<CreateOutcome> {
  const policy = deps.policy ?? 'full'
  const providers = policy === 'deterministic-only' ? [] : deps.providers
  const log = deps.logger
  const attempt = newAttempt(deps, dateSlug, 'assemble')
  // One lease owner per invocation: two concurrent builds in the same run must
  // not be able to "resume" each other's lease.
  const owner = `${log.runId}:${dateSlug}:${crypto.randomUUID().slice(0, 8)}`
  let leased = false

  try {
    const lease = await log.stage('lease', () =>
      deps.repo.acquireAssembly(dateSlug, owner, {
        ttlSeconds: deps.leaseSeconds ?? 900,
        archiveOrigin: options.archiveOrigin ?? 'native',
      }),
    )
    if (!lease.acquired) {
      attempt.lifecycleStage = `lease:${lease.lifecycle}`
      attempt.publicationResult = 'skipped'
      attempt.warnings.push(`edition is ${lease.lifecycle}; not assembling`)
      log.info('assemble_skipped', { dateSlug, lifecycle: lease.lifecycle })
      return { result: 'skipped', reason: lease.lifecycle }
    }
    leased = true

    const recent = await log.stage('history', () => deps.repo.recentCompositions(dateSlug, 14))
    const base = await log.stage('modules', () => buildBaseEdition(dateSlug, deps.sources))
    attempt.moduleFailures.push(...base.failures)
    attempt.assetFallbacks.push(...base.assetFallbacks)

    const seedString = editionSeed(dateSlug)
    const seed = hashString(seedString)
    const recentComicIds = recent.map((r) => r.comicId).filter((x): x is string => Boolean(x))

    const frameInput: FrameInput = {
      dateSlug,
      scripture: base.scripture,
      title: base.lead?.title ?? base.scripture.reference,
      teaser: base.teaser || base.scripture.text,
      seriesTitle: base.seriesTitle,
      liturgicalLabel: base.liturgical.feast ?? base.liturgical.dayLabel,
      recentScenes: recent.map((r) => r.scene).filter((s): s is NonNullable<typeof s> => Boolean(s)),
      seed,
    }

    const frame = await log.stage('frame', () =>
      composeFrame(frameInput, {
        providers,
        lookup: deps.sources.lookupVerse,
        logger: log,
        timeoutMs: deps.providerTimeoutMs,
        retries: deps.providerRetries,
        sleep: deps.sleep,
      }),
    )
    const frameValue: EditorialFrame = frame.value
    attempt.providerUsage.push(...frame.usage)

    const liveItems: Edition = base.liveItems
    const comic = await log.stage('comic', async () =>
      composeComic({
        dateSlug,
        liveItems,
        bank: await deps.sources.publishedStrips(),
        recentComicIds,
        assetAvailable: (src) => deps.sources.assetAvailable(src),
      }),
    )
    attempt.providerUsage.push(...comic.usage)
    attempt.warnings.push(...comic.notes)
    if (comic.level === 'archive-reprint' || comic.level === 'omitted') {
      attempt.assetFallbacks.push(`comic: ${comic.level}`)
    }

    const modules: EditionModule[] = [...base.modules]
    modules.push({
      type: 'scene',
      scene: frameValue.scene,
      renderer: (['riso', 'halftone', 'ascii'] as const)[seed % 3],
      seed: hashString(`${seedString}:${frameValue.scene}`) % 100_000,
      label: frameValue.sceneLabel,
    })
    if (comic.module) modules.push(comic.module)
    if (frameValue.rabbitHoles.length > 0) {
      modules.push({ type: 'rabbitHoles', items: frameValue.rabbitHoles })
    }

    const date = slugToUtcDate(dateSlug)
    const composition = await log.stage('composition', async () =>
      composeEdition(
        {
          dateSlug,
          seed,
          weekday: date.getUTCDay(),
          season: base.liturgical.season,
          dayLabel: base.liturgical.dayLabel,
          feast: base.liturgical.feast,
          primaryReference: base.scripture.reference,
          recentArchetypes: recent.map((r) => r.archetype),
        },
        modules.map((m) => m.type),
      ),
    )

    const primary: ProviderId =
      frame.usage.find((u) => u.provider !== 'deterministic' && u.attempts > 0)?.provider ?? 'deterministic'
    const fallbackUsed = [...new Set(frame.fallbackProvidersUsed)]
    const quality = decideQuality({
      policy,
      frameDeterministic: frame.deterministic,
      comicLevel: comic.level,
      scriptureSource: base.scriptureSource,
      hasLead: Boolean(base.lead),
      hasReading: Boolean(base.reading),
      failedModules: base.failures.map((f) => f.module),
    })

    const title = base.lead?.title ?? base.scripture.reference
    const document: EditionDocument = {
      schemaVersion: DAILY_BREAD_SCHEMA_VERSION,
      editionDate: dateSlug,
      slug: dateSlug,
      archiveOrigin: options.archiveOrigin ?? 'native',
      quality,
      title,
      deck: frameValue.deck,
      primaryScripture: base.scripture,
      liturgical: base.liturgical,
      seed: seedString,
      composition,
      modules,
      assets: {
        ...(base.lead?.plate ? { leadPlate: base.lead.plate } : {}),
        scenePoster: {
          scene: frameValue.scene,
          seed: hashString(`${seedString}:${frameValue.scene}`) % 100_000,
        },
        og: {
          title,
          kicker: base.liturgical.feast ?? base.liturgical.dayLabel,
          verse: base.scripture.text.slice(0, 220),
          verseRef: base.scripture.reference,
        },
        fallbacks: attempt.assetFallbacks.slice(),
      },
      generation: {
        runId: log.runId,
        builtAt: deps.clock.now().toISOString(),
        primaryProvider: primary,
        fallbackProvidersUsed: fallbackUsed,
        usage: [...frame.usage, ...comic.usage].map((u: ProviderUsage) => ({ ...u })),
        moduleFailures: base.failures,
        assetFallbacks: attempt.assetFallbacks.slice(),
        comicLevel: comic.level,
        sourceItemIds: [...base.sourceItemIds, ...comic.sourceItemIds],
      },
      rendererVersion: DAILY_BREAD_RENDERER_VERSION,
    }

    attempt.primaryProvider = primary
    attempt.fallbackProvidersUsed = fallbackUsed
    attempt.quality = quality

    const problems = validateEditionDocument(document)
    if (problems.length > 0) {
      throw new Error(`edition document failed validation: ${problems.slice(0, 6).join('; ')}`)
    }

    const marked = await log.stage('mark_ready', () => deps.repo.markReady(dateSlug, owner, document))
    if (marked !== 'ready') {
      throw new Error(`mark ready returned ${marked}`)
    }
    leased = false
    attempt.lifecycleStage = 'ready'
    attempt.publicationResult = 'ready'
    log.info('edition_ready', {
      dateSlug,
      quality,
      archetype: composition.archetype,
      comicLevel: comic.level,
      frameProvider: frame.provider,
      moduleCount: modules.length,
      moduleFailures: base.failures.length,
    })
    return { result: 'ready', quality, document }
  } catch (error) {
    attempt.errors.push({ stage: attempt.lifecycleStage, message: errorMessage(error) })
    attempt.publicationResult = 'failed'
    log.error('assemble_failed', error, { dateSlug })
    if (leased) {
      await deps.repo.releaseAssembly(dateSlug, owner).catch((releaseError) =>
        log.error('lease_release_failed', releaseError, { dateSlug }),
      )
    }
    return { result: 'failed', reason: errorMessage(error) }
  } finally {
    await finish(deps, attempt)
  }
}

export interface RunSummary {
  liveDate: string
  nextDate: string
  actions: { date: string; action: string; result: string; detail?: string }[]
  ok: boolean
}

/**
 * The scheduler step. Idempotent and safe to run as often as the scheduler
 * likes: every branch checks the persisted lifecycle first, and the database
 * serializes concurrent runs (lease + advisory lock).
 */
export async function runDailyBread(deps: PipelineDeps): Promise<RunSummary> {
  const plan = schedulePlan(deps.clock)
  const actions: RunSummary['actions'] = []

  // 1. The live paper must exist and be published.
  let live = await deps.repo.getLifecycle(plan.liveDate)
  if (live === 'ready') {
    const p = await publishDailyBreadEdition(plan.liveDate, deps)
    actions.push({ date: plan.liveDate, action: 'publish', result: p.result, detail: p.reason })
    if (p.result === 'rebuild_required') live = 'draft'
  }
  if (live === null || live === 'draft' || live === 'assembling') {
    const c = await createDailyBreadEdition(plan.liveDate, deps)
    actions.push({ date: plan.liveDate, action: 'emergency-build', result: c.result, detail: c.reason })
    if (c.result === 'ready') {
      const p = await publishDailyBreadEdition(plan.liveDate, deps)
      actions.push({ date: plan.liveDate, action: 'publish', result: p.result, detail: p.reason })
    }
  }

  // 2. Tomorrow's paper: build inside the window so it is ready at rollover.
  if (plan.inBuildWindow) {
    const next = await deps.repo.getLifecycle(plan.nextDate)
    if (next !== 'ready' && next !== 'published' && next !== 'superseded') {
      const c = await createDailyBreadEdition(plan.nextDate, deps)
      actions.push({ date: plan.nextDate, action: 'build', result: c.result, detail: c.reason })
    } else {
      actions.push({ date: plan.nextDate, action: 'build', result: 'skipped', detail: next })
    }
  }

  const liveNow = await deps.repo.getLifecycle(plan.liveDate)
  const ok = liveNow === 'published' || liveNow === 'superseded'
  deps.logger.info('run_summary', { ...plan, nextRollover: plan.nextRollover.toISOString(), actions, ok })
  return { liveDate: plan.liveDate, nextDate: plan.nextDate, actions, ok }
}

