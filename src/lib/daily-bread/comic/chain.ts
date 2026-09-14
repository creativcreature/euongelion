/**
 * The comic, end to end — ROOT CAUSE and FIX (SA-142 / F-184).
 *
 * Why the SA-090 strip never loaded: it was not a rendering fault. The page
 * printed its reserved "The strip is being drawn" frame because no strip row
 * existed for the day. Rows were never produced because (1) the strip machine
 * is paused by default (vars.STRIP_MACHINE), (2) the daily gap-fill never
 * installs the Claude CLI so its tier probe always fails and it exits 0,
 * (3) the weekly job's 15-minute timeout ends before its last (strip) step,
 * (4) a tier-3 fallback unsets the OAuth token and the Sunday lead step
 * throws, skipping every later step, and (5) the failure alert cannot file an
 * issue (contents: read), so nobody saw any of it.
 *
 * V2 removes the single point of failure: the SCRIPT (structured, validated)
 * is separate from the RENDER (deterministic SVG, cannot fail to load), and a
 * five-level chain always resolves:
 *
 *   1. approved-art          a founder-reviewed strip image row for the date
 *   2. generated-script      a model-composed script from the fixed vocabulary,
 *                            validated (ids, coordinates, prose, verbatim BSB
 *                            captions) and render-checked
 *   3. deterministic-script  a committed wordless template (anti-repeat)
 *   4. archive-reprint       the most recent published strip, credited
 *   5. omitted               the module is left out; the composition closes
 *                            the gap (no placeholder frame is ever printed)
 */
import type { Edition } from '@/lib/edition/store'
import type { DailyBreadRepository } from '../repository/types'
import type { RunLogger } from '../log'
import { errorMessage } from '../redact'
import { cleanText, safeAssetSrc } from '../safe'
import type {
  ComicModule,
  ComicScript,
  ComicSourceLevel,
  PrimaryScripture,
  ProviderUsage,
} from '../types'
import { runProviderChain, extractJsonObject } from '../providers/chain'
import { OutputValidationError, type TextProvider } from '../providers/types'
import { proseProblems } from '../generate/guards'
import type { VerseLookup } from '../generate/frame'
import { COMIC_TEMPLATES } from './templates'
import {
  COMIC_FIGURES,
  COMIC_SETTINGS,
  validateComicScript,
  verifyComicCaptions,
} from './validate'
import { renderComicStrip } from './render'
import { assertSafeSvgTree } from './svg'

export interface ComicChainResult {
  module: ComicModule | null
  level: ComicSourceLevel
  usage: ProviderUsage[]
  providerDeterministic: boolean
  notes: string[]
  sourceItemIds: string[]
}

export function templateById(id: string): ComicScript | undefined {
  return COMIC_TEMPLATES.find((t) => t.id === id)
}

/** Render-check a script: it must produce a safe SVG tree. */
export function renderable(script: ComicScript): string[] {
  try {
    assertSafeSvgTree(renderComicStrip(script))
    return []
  } catch (error) {
    return [`render: ${errorMessage(error, 160)}`]
  }
}

function comicPrompt(
  date: string,
  scripture: PrimaryScripture,
  inspiration: ComicScript,
): string {
  return [
    `Date: ${date}`,
    `Primary Scripture (${scripture.reference}, BSB): ${scripture.text}`,
    '',
    'Compose a gentle, WORDLESS three-panel strip for a Christian daily paper, staging ONE small visual moment that sits beside this Scripture. The three panels are one continuous little story (the same place or the same figure moving through it), not three unrelated pictures.',
    'No dialogue, no speech, no jokes, no named characters, no depiction of the face of Jesus. Figures are simple faceless silhouettes.',
    `Allowed settings: ${COMIC_SETTINGS.join(', ')}`,
    `Allowed figures: ${COMIC_FIGURES.join(', ')}`,
    'Each panel: 1-4 figures with x and y between 0 and 1 (0,0 = top-left), scale between 0.3 and 1.6, optional flip.',
    'description: one plain sentence (10-160 characters) describing what the panel shows, for a screen reader. No quotation marks.',
    'caption (REQUIRED on exactly ONE panel, usually the last): an EXACT substring of the Primary Scripture text above, at most 140 characters. Other panels have no caption field.',
    '',
    'Here is an example of the exact JSON shape (a committed strip — do not copy it):',
    JSON.stringify(inspiration),
    '',
    `Return ONLY the JSON object with "title" (3-60 characters), "scriptureReference": "${scripture.reference}", and "panels".`,
  ].join('\n')
}

export async function composeComic(params: {
  dateSlug: string
  scripture: PrimaryScripture
  liveItems: Edition
  frameTemplateId: string
  recentComicIds: string[]
  recentEditionDates: string[]
  providers: TextProvider[]
  lookup: VerseLookup
  repo: Pick<DailyBreadRepository, 'getEdition'>
  logger?: RunLogger
  timeoutMs?: number
  retries?: number
  sleep?: (ms: number) => Promise<void>
}): Promise<ComicChainResult> {
  const notes: string[] = []
  const usage: ProviderUsage[] = []

  // 1. Approved art: a reviewed strip image row that is live at rollover.
  const stripItem = params.liveItems.strip?.[0]
  if (stripItem) {
    const p = stripItem.payload
    const src = safeAssetSrc(p.image)
    if (src && p.width && p.height) {
      return {
        module: {
          type: 'comic',
          level: 'approved-art',
          title: cleanText(p.caption, 120),
          caption: cleanText(p.caption, 200),
          image: {
            src,
            width: p.width,
            height: p.height,
            alt: cleanText(p.alt, 400),
          },
        },
        level: 'approved-art',
        usage,
        providerDeterministic: false,
        notes,
        sourceItemIds: stripItem.id ? [stripItem.id] : [],
      }
    }
    notes.push('comic: strip row present but its image failed the asset policy')
  }

  const inspiration =
    templateById(params.frameTemplateId) ??
    COMIC_TEMPLATES.find((t) => !params.recentComicIds.includes(t.id)) ??
    COMIC_TEMPLATES[0]

  // 2 → 3. Generated script, falling to the chosen committed template.
  try {
    const outcome = await runProviderChain<ComicScript>({
      task: 'comic-script',
      providers: params.providers,
      request: {
        system:
          'You compose structured storyboards for a quiet wordless comic strip. Return only JSON. Never write dialogue or quotations other than an exact Scripture substring when asked.',
        prompt: comicPrompt(params.dateSlug, params.scripture, inspiration),
        maxOutputTokens: 1200,
        temperature: 0.7,
        json: true,
      },
      parse: (text) => {
        const raw = extractJsonObject(text) as Partial<ComicScript>
        // A blank caption ("" or null) is a model's way of writing "no caption"
        // on the uncaptioned panels; the exactly-one-caption rule still applies.
        if (Array.isArray(raw.panels)) {
          for (const panel of raw.panels as { caption?: unknown }[]) {
            if (panel && typeof panel === 'object' && (panel.caption === null || (typeof panel.caption === 'string' && panel.caption.trim() === ''))) {
              delete panel.caption
            }
          }
        }
        return { ...raw, id: `gen-${params.dateSlug}` } as ComicScript
      },
      validate: async (script) => {
        const problems = validateComicScript(script)
        if (problems.length > 0) return problems
        if (script.scriptureReference !== params.scripture.reference) {
          problems.push('scriptureReference must be the primary Scripture')
        }
        problems.push(
          ...proseProblems(script.title, 'title', { min: 3, max: 60 }),
        )
        script.panels.forEach((panel, i) =>
          problems.push(
            ...proseProblems(panel.description, `panels[${i}].description`, {
              min: 10,
              max: 160,
            }),
          ),
        )
        const captions = script.panels.filter((p) => p.caption).length
        if (captions > 1) problems.push('at most one caption')
        // Every committed strip carries its verbatim Scripture line; a
        // generated one must too, or it is a picture with no anchor.
        if (captions === 0) problems.push('exactly one panel must carry a verbatim Scripture caption')
        problems.push(
          ...(await verifyComicCaptions(
            script,
            async (ref) => (await params.lookup(ref)).text,
          )),
        )
        problems.push(...renderable(script))
        return problems
      },
      deterministic: () => inspiration,
      timeoutMs: params.timeoutMs,
      retries: params.retries,
      logger: params.logger,
      sleep: params.sleep,
    })
    usage.push(...outcome.usage)
    const script = outcome.value
    const renderProblems = renderable(script)
    if (renderProblems.length > 0)
      throw new OutputValidationError(renderProblems)
    const level: ComicSourceLevel = outcome.deterministic
      ? 'deterministic-script'
      : 'generated-script'
    const captioned = script.panels.find((p) => p.caption)
    return {
      module: {
        type: 'comic',
        level,
        title: script.title,
        // The verbatim Scripture line only; the strip prints its own reference.
        caption: captioned?.caption ?? '',
        script,
      },
      level,
      usage,
      providerDeterministic: outcome.deterministic,
      notes,
      sourceItemIds: [],
    }
  } catch (error) {
    notes.push(`comic: script levels failed: ${errorMessage(error, 200)}`)
  }

  // 4. Archive reprint: the most recent published strip, credited.
  for (const date of params.recentEditionDates) {
    try {
      const prior = await params.repo.getEdition(date)
      const comic = prior?.modules.find(
        (m): m is ComicModule => m.type === 'comic',
      )
      if (comic?.script && renderable(comic.script).length === 0) {
        return {
          module: {
            type: 'comic',
            level: 'archive-reprint',
            title: comic.title,
            caption: comic.caption,
            script: comic.script,
            firstRan: comic.firstRan ?? date,
          },
          level: 'archive-reprint',
          usage,
          providerDeterministic: true,
          notes,
          sourceItemIds: [],
        }
      }
    } catch (error) {
      notes.push(
        `comic: archive read failed for ${date}: ${errorMessage(error, 120)}`,
      )
    }
  }

  // 5. Omitted — recorded, never a placeholder.
  notes.push('comic: omitted (no level resolved)')
  return {
    module: null,
    level: 'omitted',
    usage,
    providerDeterministic: true,
    notes,
    sourceItemIds: [],
  }
}
