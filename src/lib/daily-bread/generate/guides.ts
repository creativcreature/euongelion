/**
 * HOW TO READ — three new guide articles per edition day (SA-114 / F-158),
 * behind the editorial generation interface (plan §21). This is the Claude
 * workflow that ran as scripts/edition/compose-guides-claude.mjs; the prompt
 * and the validation rules are unchanged, and it never needed file access.
 *
 * No deterministic floor: these are drafts for the founder's queue, and a day
 * without them prints the committed guide bank's rotation.
 */
import { OutputValidationError } from '../providers/types'
import type { EditorialGenerator, GenerationResult } from './editorial'

export const GUIDES_TASK = 'guides'

export const GUIDE_KICKERS = ['Method', 'Practice', 'Tools', 'Getting started'] as const

export interface WrittenGuide {
  kicker: (typeof GUIDE_KICKERS)[number]
  title: string
  standfirst: string
  steps: string[]
  minutes: string
  body: string[]
}

export function guidesPrompt(date: string, coveredTitles: readonly string[]): string {
  return `You write the "How to read" column for The Daily Bread — Euangelion's daily paper (Christian devotional, sacred-minimalist, never preachy, treats the reader as intelligent). Write THREE fresh, practical, genuinely useful short articles about reading and studying the Bible for the ${date} edition.

ALREADY-COVERED topics (do NOT repeat or closely echo):
${coveredTitles.map((t) => `- ${t}`).join('\n') || '- (none yet)'}

Each article: a specific, practical angle (a method, a habit, a tool, a beginner's on-ramp — think: reading one book whole, lectio divina, how to use a concordance, reading the Psalms aloud, what to do with a text that offends you, reading with children, memorizing without gimmicks). Concrete over abstract. No therapy-speak, no listicle voice, no "unlock/transform" language.

Answer ONLY this JSON (no fences): an array of EXACTLY 3 objects:
[{"kicker":"Method|Practice|Tools|Getting started","title":"...","standfirst":"one italic-worthy sentence","steps":["3-5 short imperative steps"],"minutes":"N MIN","body":["4-7 substantial paragraphs of the actual article — 300-500 words total, written plainly and warmly"]}]`
}

export function parseGuides(text: string): unknown {
  const body = text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '')
  const start = body.indexOf('[')
  const end = body.lastIndexOf(']')
  if (start === -1 || end <= start) throw new OutputValidationError(['no JSON array in output'])
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new OutputValidationError(['output is not valid JSON'])
  }
}

/** The SA-114 rules, each broken one reported (the old script stopped at the first). */
export function guidesProblems(set: unknown): string[] {
  if (!Array.isArray(set) || set.length !== 3) return ['need exactly 3']
  const problems: string[] = []
  set.forEach((g: Record<string, unknown>, i) => {
    const at = `article ${i + 1}`
    if (!GUIDE_KICKERS.includes(g?.kicker as WrittenGuide['kicker'])) problems.push(`${at}: kicker ${String(g?.kicker)}`)
    for (const f of ['title', 'standfirst', 'minutes']) {
      if (typeof g?.[f] !== 'string' || !(g[f] as string).trim()) problems.push(`${at}: missing ${f}`)
    }
    if (!Array.isArray(g?.steps) || g.steps.length < 3 || g.steps.length > 5) problems.push(`${at}: steps 3-5`)
    if (!Array.isArray(g?.body) || g.body.length < 4 || g.body.length > 8) {
      problems.push(`${at}: body 4-8 paragraphs`)
    } else if ((g.body as unknown[]).join(' ').split(/\s+/).length < 250) {
      problems.push(`${at}: body too thin`)
    }
  })
  return problems
}

export function composeGuides(params: {
  generator: EditorialGenerator
  date: string
  coveredTitles: readonly string[]
}): Promise<GenerationResult<WrittenGuide[]>> {
  return params.generator.generate<WrittenGuide[]>({
    task: GUIDES_TASK,
    system: '',
    prompt: guidesPrompt(params.date, params.coveredTitles),
    maxOutputTokens: 4000,
    temperature: 0.7,
    parse: (text) => parseGuides(text) as WrittenGuide[],
    validate: guidesProblems,
    // The SA-114 run allowed seven minutes per attempt.
    timeoutMs: 420_000,
  })
}
