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
} from '../types'
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
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
): { archetype: ArchetypeId; score: number }[] {
  const rng = createRng(ctx.seed ^ 0xa4c3)
  return ARCHETYPE_IDS.map((id) => {
    const jitter = rng.next() * 0.6
    if (!eligible(ARCHETYPES[id], present)) return { archetype: id, score: -Infinity }
    const score = affinity(id, ctx, present) + jitter - recencyPenalty(id, ctx.recentArchetypes)
    return { archetype: id, score: Math.round(score * 1000) / 1000 }
  }).sort((a, b) => b.score - a.score || a.archetype.localeCompare(b.archetype))
}

export function chooseArchetype(
  ctx: CompositionContext,
  present: Set<EditionModuleType>,
): { archetype: ArchetypeId; scoring: { archetype: ArchetypeId; score: number }[] } {
  const scoring = scoreArchetypes(ctx, present)
  const yesterday = ctx.recentArchetypes[0]
  const viable = scoring.filter((s) => Number.isFinite(s.score))
  const pick = viable.find((s) => s.archetype !== yesterday) ?? viable[0]
  if (!pick) {
    // Every archetype requires the reading; a paper without it is not composed.
    throw new Error('composition: no archetype is eligible for these modules')
  }
  return {
    archetype: pick.archetype,
    scoring: scoring.map((s) => ({ ...s, score: Number.isFinite(s.score) ? s.score : -1 })),
  }
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
    // A band that lost a partner widens its remaining item to the full row.
    const lone = items.length === 1 && def.items.length > 1
    for (const [module, span] of items) {
      placed.add(module)
      placements.push({
        module,
        region,
        span: lone ? 'full' : span,
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
  options: { archetype?: ArchetypeId } = {},
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
  const placed = new Set<EditionModuleType>()
  const front = place(def.front, 'front', present, placed, 0)
  const body = place(def.bands, 'sheet', present, placed, front.nextBand)
  const omitted = new Set(def.omit)

  // Leftovers join the back sheet in standard order: full-width pieces take
  // their own band; standing pieces pair two to a band (a lone one widens).
  const leftovers = STANDARD_ORDER.filter((m) => present.has(m) && !placed.has(m) && !omitted.has(m))
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
      push(first, 'half', 'dense')
      push(m, 'half', 'dense')
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
  }
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
