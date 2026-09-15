/**
 * Composition: choose today's archetype (affinity + seeded jitter − recency
 * penalty), then lay the edition's modules into it. Pure and seeded — the
 * same modules, context and history always produce the same manifest.
 */
import { createRng } from '../prng'
import type {
  ArchetypeId,
  CompositionManifest,
  EditionModuleType,
  HeroVariant,
  Placement,
  RhythmBeat,
} from '../types'
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  MODULE_ROLES,
  MODULE_TIERS,
  STANDARD_ORDER,
  type ArchetypeDefinition,
  type Band,
} from './archetypes'

export interface CompositionContext {
  dateSlug: string
  seed: number
  /** 0 = Sunday … 6 = Saturday, of the editorial date. */
  weekday: number
  season: string
  dayLabel: string
  feast?: string
  primaryReference: string
  /** Most recent first (index 0 = yesterday's edition). */
  recentArchetypes: ArchetypeId[]
  /** Module types printed on recent days, most recent first (plan §40 rotation). */
  recentPrinted?: EditionModuleType[][]
  /** Hero treatments of recent days, most recent first (plan §42). */
  recentHeroes?: (HeroVariant | undefined)[]
}

const GOSPELS = /^(Matthew|Mark|Luke|John)\b/

export function affinity(id: ArchetypeId, ctx: CompositionContext, present: Set<EditionModuleType>): number {
  const sunday = ctx.weekday === 0
  const penitential = ['lent', 'holy-week', 'advent'].includes(ctx.season)
  const festal = ['easter', 'christmas', 'pentecost'].includes(ctx.season)
  const somberDay = /Good Friday|Holy Saturday|Ash Wednesday/.test(ctx.dayLabel)
  switch (id) {
    case 'broadsheet':
      return 1.6 + (ctx.weekday === 1 ? 0.3 : 0)
    case 'illuminated':
      return 1.0 + (sunday ? 0.8 : 0) + (ctx.feast ? 0.6 : 0)
    case 'quiet':
      return 0.7 + (penitential && !sunday ? 0.9 : 0) + (somberDay ? 2.5 : 0)
    case 'field-notes':
      return 1.0 + (ctx.weekday === 2 || ctx.weekday === 4 ? 0.7 : 0)
    case 'red-letter':
      return 0.9 + (GOSPELS.test(ctx.primaryReference) ? 0.9 : 0)
    case 'study-table':
      return 1.0 + (ctx.weekday === 3 ? 0.8 : 0) + (ctx.weekday === 6 ? 0.3 : 0)
    case 'joy':
      return (
        0.8 +
        (festal ? 1.2 : 0) +
        (ctx.feast && !somberDay ? 0.6 : 0) +
        (ctx.weekday === 6 ? 0.5 : 0) +
        (present.has('goodNews') ? 0.6 : 0) -
        (somberDay ? 3 : 0)
      )
    case 'prayer-book':
      return 1.0 + (sunday ? 0.8 : 0) + (ctx.weekday === 5 ? 0.5 : 0) + (penitential ? 0.5 : 0)
  }
}

export function recencyPenalty(id: ArchetypeId, recent: ArchetypeId[]): number {
  const weights = [3.0, 1.6, 1.0, 0.5, 0.5, 0.5, 0.5]
  let penalty = 0
  recent.slice(0, 7).forEach((a, i) => {
    if (a === id) penalty += weights[i]
  })
  const lastWeek = recent.slice(0, 7).filter((a) => a === id).length
  if (lastWeek >= 3) penalty += 2
  return penalty
}

export function eligible(def: ArchetypeDefinition, present: Set<EditionModuleType>): boolean {
  return def.requires.every((m) => present.has(m))
}

export function scoreArchetypes(
  ctx: CompositionContext,
  present: Set<EditionModuleType>,
): { archetype: ArchetypeId; score: number; why: string }[] {
  const rng = createRng(ctx.seed ^ 0xa4c3)
  const r2 = (n: number) => Math.round(n * 100) / 100
  return ARCHETYPE_IDS.map((id) => {
    const jitter = rng.next() * 0.6
    const missing = ARCHETYPES[id].requires.filter((m) => !present.has(m))
    if (missing.length > 0) return { archetype: id, score: -Infinity, why: `not eligible: needs ${missing.join(', ')}` }
    const a = affinity(id, ctx, present)
    const r = recencyPenalty(id, ctx.recentArchetypes)
    const score = a + jitter - r
    return {
      archetype: id,
      score: Math.round(score * 1000) / 1000,
      why: `affinity ${r2(a)} + jitter ${r2(jitter)} − recency ${r2(r)}`,
    }
  }).sort((a, b) => b.score - a.score || a.archetype.localeCompare(b.archetype))
}

/** The hero an archetype would open with, given the modules on hand. */
export function expectedHero(def: ArchetypeDefinition, present: Set<EditionModuleType>): HeroVariant {
  return heroVariant(place(def.front, 'front', present, new Set(), 0).placements)
}

/**
 * Plan §42 hard exclusions: never yesterday's archetype, and never yesterday's
 * hero treatment (Broadsheet and Field Notes both open on the lead and its
 * rail; Illuminated and Joy both open on the scene). Each gives way only when
 * nothing else is eligible, and the manifest's scoring says why a higher score
 * was passed over.
 */
export function chooseArchetype(
  ctx: CompositionContext,
  present: Set<EditionModuleType>,
): { archetype: ArchetypeId; scoring: { archetype: ArchetypeId; score: number; why: string }[] } {
  const scoring = scoreArchetypes(ctx, present)
  const yesterday = ctx.recentArchetypes[0]
  const yesterdayHero = ctx.recentHeroes?.[0]
  const viable = scoring.filter((s) => Number.isFinite(s.score))
  const sameHero = (id: ArchetypeId) => Boolean(yesterdayHero) && expectedHero(ARCHETYPES[id], present) === yesterdayHero
  const pick =
    viable.find((s) => s.archetype !== yesterday && !sameHero(s.archetype)) ??
    viable.find((s) => s.archetype !== yesterday) ??
    viable[0]
  if (!pick) {
    // Every archetype requires the reading; a paper without it is not composed.
    throw new Error('composition: no archetype is eligible for these modules')
  }
  return {
    archetype: pick.archetype,
    scoring: scoring.map((s) => ({
      ...s,
      score: Number.isFinite(s.score) ? s.score : -1,
      why:
        s.archetype === pick.archetype
          ? `${s.why} — chosen`
          : Number.isFinite(s.score) && s.score > pick.score
            ? `${s.why} — passed over: ${s.archetype === yesterday ? 'printed yesterday' : `same hero as yesterday (${yesterdayHero})`}`
            : s.why,
    })),
  }
}

const SPAN_COLUMNS: Record<Placement['span'], number> = { full: 6, wide: 4, half: 3, third: 2, narrow: 2 }

/** Spans that fill the six-column row for the pieces a band kept. */
export function fillRow(spans: Placement['span'][], designed: number): Placement['span'][] {
  if (spans.length === designed || spans.reduce((s, x) => s + SPAN_COLUMNS[x], 0) === 6) return spans
  if (spans.length === 1) return ['full']
  if (spans.length === 2) {
    if (spans[0] === 'wide' || spans[1] === 'narrow') return ['wide', 'narrow']
    if (spans[1] === 'wide' || spans[0] === 'narrow') return ['narrow', 'wide']
    return ['half', 'half']
  }
  return spans.map(() => 'third')
}

function place(
  bands: Band[],
  region: Placement['region'],
  present: Set<EditionModuleType>,
  placed: Set<EditionModuleType>,
  firstBand: number,
) {
  const placements: Placement[] = []
  const rhythm: CompositionManifest['rhythm'] = []
  let band = firstBand
  for (const def of bands) {
    const items = def.items.filter(([m]) => present.has(m) && !placed.has(m))
    if (items.length === 0) continue
    rhythm.push(def.beat)
    // A band that lost a partner (a resting department) re-spans what is left
    // so the row stays full: one piece takes the row, two pieces keep a
    // wide/narrow pairing when they had one, else split it in half.
    const spans = fillRow(items.map(([, span]) => span), def.items.length)
    for (const [i, [module]] of items.entries()) {
      const span = spans[i]
      placed.add(module)
      placements.push({
        module,
        region,
        span,
        tier: MODULE_TIERS[module],
        band,
        beat: def.beat,
      })
    }
    band += 1
  }
  return { placements, rhythm, nextBand: band }
}

export function composeEdition(
  ctx: CompositionContext,
  moduleTypes: EditionModuleType[],
  /** rotate: false prints every module present (a backfilled import of a past paper). */
  options: { archetype?: ArchetypeId; rotate?: boolean } = {},
): CompositionManifest {
  const present = new Set(moduleTypes)
  const chosen = chooseArchetype(ctx, present)
  // An explicit archetype (admin re-compose, QA) is honoured only when its
  // required modules are present.
  const forced =
    options.archetype && eligible(ARCHETYPES[options.archetype], present) ? options.archetype : null
  const archetype = forced ?? chosen.archetype
  const scoring = chosen.scoring
  const def = ARCHETYPES[archetype]
  // Plan §40: anchors always; departments and interactives rotate within the
  // archetype's budget, the longest-rested first.
  const rotation = options.rotate === false ? { printed: [...present], rested: [] } : selectModules(def, present, ctx)
  const printing = new Set(rotation.printed)
  const placed = new Set<EditionModuleType>()
  const front = place(def.front, 'front', printing, placed, 0)
  const body = place(def.bands, 'sheet', printing, placed, front.nextBand)
  const omitted = new Set(def.omit)

  // Leftovers join the back sheet in standard order: full-width pieces take
  // their own band; standing pieces pair two to a band (a lone one widens).
  // Pairs alternate their proportions so the back sheet is never a run of
  // same-sized cards (plan §41).
  const PAIR_SPANS: [Placement['span'], Placement['span']][] = [['half', 'half'], ['wide', 'narrow'], ['narrow', 'wide']]
  let pairs = 0
  const leftovers = STANDARD_ORDER.filter((m) => printing.has(m) && !placed.has(m) && !omitted.has(m))
  const back: Placement[] = []
  const rhythm: CompositionManifest['rhythm'] = []
  let band = body.nextBand
  let pending: EditionModuleType | null = null
  const fullWidth = (m: EditionModuleType) =>
    MODULE_TIERS[m] === 'play' || m === 'reading' || m === 'guides' || m === 'gallery' || m === 'comic' || m === 'scene'
  const push = (m: EditionModuleType, span: Placement['span'], beat: Placement['beat']) =>
    back.push({
      module: m,
      region: m === 'reading' || m === 'coloring' ? 'back' : 'sheet',
      span,
      tier: MODULE_TIERS[m],
      band,
      beat,
    })
  const flush = () => {
    if (pending) {
      push(pending, 'full', 'open')
      rhythm.push('open')
      band += 1
      pending = null
    }
  }
  for (const m of leftovers) {
    if (fullWidth(m)) {
      flush()
      push(m, 'full', m === 'reading' ? 'open' : 'dense')
      rhythm.push(m === 'reading' ? 'open' : 'dense')
      band += 1
    } else if (pending) {
      const first: EditionModuleType = pending
      pending = null
      const [a, b] = PAIR_SPANS[pairs % PAIR_SPANS.length]
      pairs += 1
      push(first, a, 'dense')
      push(m, b, 'dense')
      rhythm.push('dense')
      band += 1
    } else {
      pending = m
    }
  }
  flush()

  const placements = [...front.placements, ...body.placements, ...back]
  return {
    archetype,
    seed: ctx.seed,
    rhythm: [...front.rhythm, ...body.rhythm, ...rhythm],
    placements,
    scoring,
    heroVariant: heroVariant(placements),
    density: def.presentation.density,
    moduleOrder: placements.map((p) => p.module),
    accentStrategy: def.presentation.accent,
    separatorStyle: def.presentation.separator,
    motionLevel: def.presentation.motion,
    beats: rhythmBeats(placements),
    rotation: { printed: placements.map((p) => p.module), rested: rotation.rested },
  }
}

/**
 * Plan §40. Anchors (and the archetype's own requirements) print whenever they
 * exist. Departments and interactives compete for the archetype's budget:
 * the one printed longest ago (or never) wins, ties broken by seeded jitter,
 * so the same inputs always give the same paper.
 */
export function selectModules(
  def: ArchetypeDefinition,
  present: Set<EditionModuleType>,
  ctx: CompositionContext,
): { printed: EditionModuleType[]; rested: { module: EditionModuleType; lastPrintedDaysAgo: number | null }[] } {
  const rng = createRng(ctx.seed ^ 0x51ec)
  const recent = ctx.recentPrinted ?? []
  const lastPrinted = (m: EditionModuleType): number | null => {
    const i = recent.findIndex((day) => day.includes(m))
    return i === -1 ? null : i + 1
  }
  const omitted = new Set(def.omit)
  const keep = new Set([...present].filter((m) => MODULE_ROLES[m] === 'anchor' || def.requires.includes(m)))
  const printed = [...keep]
  const rested: { module: EditionModuleType; lastPrintedDaysAgo: number | null }[] = []
  for (const [role, budget] of [
    ['department', def.presentation.departments],
    ['interactive', def.presentation.interactives],
  ] as const) {
    const candidates = [...present]
      .filter((m) => MODULE_ROLES[m] === role && !keep.has(m) && !omitted.has(m))
      .sort()
      .map((m) => ({ module: m, lastPrintedDaysAgo: lastPrinted(m), jitter: rng.next() }))
      .sort(
        (a, b) =>
          (b.lastPrintedDaysAgo ?? Infinity) - (a.lastPrintedDaysAgo ?? Infinity) || b.jitter - a.jitter,
      )
    const alreadyKept = [...keep].filter((m) => MODULE_ROLES[m] === role).length
    const take = Math.max(0, budget - alreadyKept)
    printed.push(...candidates.slice(0, take).map((c) => c.module))
    rested.push(...candidates.slice(take).map(({ module, lastPrintedDaysAgo }) => ({ module, lastPrintedDaysAgo })))
  }
  return { printed, rested }
}

/** Plan §41: each band's presentation beat, read from what it holds. */
export function rhythmBeats(placements: Placement[]): RhythmBeat[] {
  const bands: Placement[][] = []
  for (const p of placements) {
    const last = bands[bands.length - 1]
    if (last && last[0].band === p.band) last.push(p)
    else bands.push([p])
  }
  return bands.map((items, i) => {
    const has = (...ms: EditionModuleType[]) => items.some((p) => ms.includes(p.module))
    if (has('crossword', 'unscramble', 'quiz', 'wordSearch')) return 'interactive'
    if (i === 0) return 'immersive'
    if (has('prayer')) return 'prayer'
    if (has('reading', 'guides')) return 'longform'
    if (items.length >= 3 || (items.length === 2 && items[0].beat === 'dense')) return 'dense'
    if (has('scripture', 'redLetter', 'rabbitHoles', 'memoryVerse')) return 'scriptural'
    if (has('scene', 'gallery')) return 'visual'
    if (has('comic', 'coloring', 'goodNews')) return 'playful'
    // A pause, or a single thing to sit with: the question, the practice.
    if (items[0].beat === 'pause' || (items.length === 1 && has('question', 'practice'))) return 'quiet'
    return 'brief'
  })
}

/** What actually opens the paper: the first band's leading module and its partner. */
export function heroVariant(placements: Placement[]): HeroVariant {
  const first = placements.filter((p) => p.band === placements[0]?.band)
  const lead = first[0]?.module
  switch (lead) {
    case 'lead': {
      const partner = first[1]?.module
      return partner === 'word' ? 'lead-with-word' : partner ? 'lead-with-rail' : 'lead'
    }
    case 'scene':
      return 'scene'
    case 'redLetter':
      return 'red-letter'
    case 'prayer':
      return 'prayer'
    default:
      return 'scripture'
  }
}
