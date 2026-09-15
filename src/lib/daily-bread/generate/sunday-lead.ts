/**
 * THE SUNDAY FEATURE (SA-100 / SA-090), behind the editorial generation
 * interface (plan §21). This is the Claude workflow that ran as
 * scripts/edition/compose-lead-claude.mjs; the brief calendar, the prompt, the
 * validation and the draft row are unchanged. Two things changed, each because
 * a provider-neutral interface requires it:
 *
 *  1. OUTPUT. The old prompt told Claude to write /tmp/sunday-lead.json with
 *     its Write tool. A provider returns text, so the prompt now asks for the
 *     same JSON as the answer.
 *  2. FILES. Rules 1 and 3 send the model into the repository (the voice guide,
 *     the reference index). Claude Code still gets read-only access and the
 *     rules verbatim. A provider that cannot read files gets the rules without
 *     the file references and no historic quotes, because the old rule forbids
 *     quoting from memory and it has nothing else to quote from.
 *
 * There is no deterministic floor: this is a draft for the founder's queue,
 * and on a Sunday without one the paper prints its rotation lead.
 */
import { extractJsonObject } from '../providers/chain'
import { OutputValidationError } from '../providers/types'
import type { EditorialGenerator, GenerationResult } from './editorial'

export const SUNDAY_LEAD_TASK = 'sunday-lead'

export interface SundayLeadBrief {
  theme: string
  scriptureReference: string
  struggle: string
}

export interface SundayLeadScripture {
  canonical: string
  text: string
}

export interface SundayLead {
  title: string
  body: string
  pullQuotes: string[]
}

const RULE_1_WITH_FILES =
  '1. 900–1100 words of body. Literate, unhurried, second-person restrained — match the voice in docs/PUBLIC-FACING-LANGUAGE.md (read it).'
const RULE_1_WITHOUT_FILES = '1. 900–1100 words of body. Literate, unhurried, second-person restrained.'
const RULE_3_WITH_FILES =
  '3. You MAY include one or two short attributed quotes from historic voices — ONLY if you take them verbatim from public/reference-index.json in this repo (search it; every chunk carries its source). Never quote from memory. If nothing fits, use none.'
const RULE_3_WITHOUT_FILES =
  '3. Do not quote historic voices. Never quote from memory, and there is no reference text here to quote from.'

export function sundayLeadPrompt(
  brief: SundayLeadBrief,
  scripture: SundayLeadScripture,
  options: { files: boolean },
): string {
  return `You are composing THE SUNDAY FEATURE for Euangelion's Daily Bread — a devotional feature article. It lands as a DRAFT for human review, so write your best and invent nothing.

THE BRIEF
- Theme: ${brief.theme}
- Scripture: ${scripture.canonical}
- The reader's condition this speaks to: ${brief.struggle}

THE SCRIPTURE TEXT (BSB, verbatim — quote from THIS text only, never from memory):
${scripture.text}

THE RULES (non-negotiable)
${options.files ? RULE_1_WITH_FILES : RULE_1_WITHOUT_FILES}
2. Movement structure: open on the reader's real condition → into the text (quote a contiguous span of the scripture above, at least 12 words, verbatim) → the turn (what the text asks/gives) → Christ connection → return to the reader's Monday.
${options.files ? RULE_3_WITH_FILES : RULE_3_WITHOUT_FILES}
4. No headers in the body; paragraphs separated by blank lines. No em-dashes.
5. Also write: a title (≤ 8 words, no colon constructions), and exactly 2 reflective pull quotes (questions, ≤ 200 chars each) drawn from the piece.

OUTPUT: answer with strict JSON only, exactly this shape:
{"title": "...", "body": "...", "pullQuotes": ["...", "..."]}
Nothing else.`
}

export function parseSundayLead(text: string): SundayLead {
  const raw = extractJsonObject(text) as Partial<Record<keyof SundayLead, unknown>>
  if (typeof raw.title !== 'string' || typeof raw.body !== 'string' || !Array.isArray(raw.pullQuotes)) {
    throw new OutputValidationError(['composed lead missing fields (title, body, pullQuotes)'])
  }
  return {
    title: raw.title.trim(),
    body: raw.body.trim(),
    pullQuotes: raw.pullQuotes.filter((q): q is string => typeof q === 'string'),
  }
}

export function sundayLeadWordCount(body: string): number {
  return body.trim().split(/\s+/).length
}

/** The SA-100 checks: fields, length, and the 12-word scripture grounding span. */
export function sundayLeadProblems(lead: SundayLead, scriptureText: string): string[] {
  const problems: string[] = []
  if (!lead.title || !lead.body) problems.push('composed lead missing fields (title, body)')
  const words = sundayLeadWordCount(lead.body)
  if (words < 700 || words > 1400) problems.push(`composed lead is ${words} words — outside 700–1400`)
  const scripWords = scriptureText.split(/\s+/)
  let grounded = false
  for (let i = 0; i + 12 <= scripWords.length && !grounded; i += 1) {
    if (lead.body.includes(scripWords.slice(i, i + 12).join(' '))) grounded = true
  }
  if (!grounded) {
    problems.push('composed lead never quotes a 12-word contiguous span of the scripture — grounding check failed')
  }
  return problems
}

export function composeSundayLead(params: {
  generator: EditorialGenerator
  brief: SundayLeadBrief
  scripture: SundayLeadScripture
  /** The repository root a file-reading provider may search. */
  repoDir: string
}): Promise<GenerationResult<SundayLead>> {
  const { brief, scripture } = params
  return params.generator.generate<SundayLead>({
    task: SUNDAY_LEAD_TASK,
    system: '',
    prompt: sundayLeadPrompt(brief, scripture, { files: true }),
    files: { dir: params.repoDir, promptWithoutFiles: sundayLeadPrompt(brief, scripture, { files: false }) },
    maxOutputTokens: 4000,
    temperature: 0.7,
    json: true,
    parse: parseSundayLead,
    validate: (lead) => sundayLeadProblems(lead, scripture.text),
    // The SA-100 run allowed 15 minutes; Claude Code searching the index is slow.
    timeoutMs: 15 * 60 * 1000,
  })
}

/** The edition_items `lead` payload, exactly as SA-100 wrote it. */
export function sundayLeadPayload(brief: SundayLeadBrief, scripture: SundayLeadScripture, lead: SundayLead) {
  return {
    mode: 'authored' as const,
    title: lead.title,
    standfirst: brief.theme,
    body: lead.body,
    scriptureReference: scripture.canonical,
    pullQuotes: lead.pullQuotes.slice(0, 2),
  }
}
