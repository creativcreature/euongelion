/**
 * Soul Audit generation quality rubric.
 *
 * Pure functions that score a generated DayContent against the closed-system
 * contract WITHOUT an LLM (no API key required, runs in CI).
 *
 * Dimensions:
 *   A. scripture_present    — scriptureText is non-empty, scriptureReference is non-empty
 *   B. source_present       — at least one endnote with a non-empty source
 *   C. structure_conformance — has title, body (600-1200 words), prayer, ≥1 reflection question
 *   D. situational_relevance — body shares meaningful content words with the reflection/theme
 *
 * Optional LLM dimension (STUBBED — disabled by default):
 *   E. llm_voice_check      — "speaks-directly / creedal" quality check. Requires
 *      RUN_SOULAUDIT_LLM_RUBRIC=1 and an ANTHROPIC_API_KEY.
 *      When the flag is absent the dimension is skipped (result: null).
 *      To enable, set both env vars and call scoreLlmVoice() directly.
 */

import type { DayContent } from '@/types/soul-audit-plan'

// ─── Individual dimension results ────────────────────────────────────────────

export interface DimensionResult {
  pass: boolean
  detail: string
}

export interface RubricResult {
  /** A: verbatim Scripture is present in the output */
  scripture_present: DimensionResult
  /** B: at least one attributed source/endnote present */
  source_present: DimensionResult
  /** C: structural conformance — title, body length, prayer, questions */
  structure_conformance: DimensionResult
  /** D: body references the person's specific situation (not generic) */
  situational_relevance: DimensionResult
  /**
   * E: optional LLM voice/creedal check.
   * null = skipped (flag not set, no API key).
   * When enabled: { pass, detail } with a short rubric verdict.
   */
  llm_voice_check: DimensionResult | null
  /** True only when every non-null dimension passes */
  overall: boolean
}

// ─── Dimension A: Scripture present ──────────────────────────────────────────

export function scoreScripturePresent(content: DayContent): DimensionResult {
  const refOk =
    typeof content.scriptureReference === 'string' &&
    content.scriptureReference.trim().length > 0
  const textOk =
    typeof content.scriptureText === 'string' &&
    content.scriptureText.trim().length > 10
  if (refOk && textOk) {
    return {
      pass: true,
      detail: `Reference: "${content.scriptureReference}", text length: ${content.scriptureText.trim().length} chars`,
    }
  }
  const missing: string[] = []
  if (!refOk) missing.push('scriptureReference is empty')
  if (!textOk) missing.push('scriptureText is empty or too short')
  return { pass: false, detail: missing.join('; ') }
}

// ─── Dimension B: Source / endnote present ───────────────────────────────────

export function scoreSourcePresent(content: DayContent): DimensionResult {
  const endnotes = content.endnotes ?? []
  const nonEmpty = endnotes.filter(
    (e) => typeof e.source === 'string' && e.source.trim().length > 0,
  )
  if (nonEmpty.length > 0) {
    return {
      pass: true,
      detail: `${nonEmpty.length} endnote(s) present. First source: "${nonEmpty[0].source}"`,
    }
  }
  return {
    pass: false,
    detail:
      endnotes.length === 0
        ? 'endnotes array is empty'
        : 'endnotes present but all have empty source field',
  }
}

// ─── Dimension C: Structural conformance ─────────────────────────────────────

const BODY_MIN_WORDS = 600
const BODY_MAX_WORDS = 1200

export function scoreStructureConformance(
  content: DayContent,
): DimensionResult {
  const issues: string[] = []

  // Title
  if (!content.title || content.title.trim().length === 0) {
    issues.push('title is empty')
  }

  // Body word count
  const body = content.textB ?? ''
  const wordCount = body
    .replace(/[#*_>`]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  if (wordCount < BODY_MIN_WORDS) {
    issues.push(`body is too short: ${wordCount} words (min ${BODY_MIN_WORDS})`)
  } else if (wordCount > BODY_MAX_WORDS) {
    // Warn but don't fail — the prompt targets 950-1150 which fits; allow
    // some overflow for the rare day that runs long.
    // Hard ceiling at 1200 catches runaway generation.
    issues.push(`body is too long: ${wordCount} words (max ${BODY_MAX_WORDS})`)
  }

  // Prayer
  if (!content.prayer || content.prayer.trim().length < 10) {
    issues.push('prayer is missing or too short')
  }

  // Reflection questions
  const questions = content.reflectionQuestions ?? []
  if (questions.length < 1) {
    issues.push('no reflection questions present')
  }

  if (issues.length === 0) {
    return {
      pass: true,
      detail: `title: "${content.title}", body: ${wordCount} words, prayer: ${content.prayer?.trim().length} chars, questions: ${questions.length}`,
    }
  }
  return { pass: false, detail: issues.join('; ') }
}

// ─── Dimension D: Situational relevance ──────────────────────────────────────

/**
 * Heuristic: extract meaningful content words (≥4 chars, not stopwords) from
 * the reflection and theme, then check how many appear in the body.
 * Pass threshold: at least 3 overlap words OR 15% of content words overlap.
 */
const STOPWORDS = new Set([
  'that',
  'this',
  'with',
  'have',
  'from',
  'they',
  'been',
  'were',
  'will',
  'just',
  'your',
  'what',
  'when',
  'more',
  'about',
  'some',
  'into',
  'like',
  'than',
  'then',
  'very',
  'even',
  'also',
  'over',
  'such',
  'here',
  'there',
  'know',
  'feel',
  'want',
  'need',
  'time',
  'life',
  'good',
  'long',
  'much',
  'back',
  'down',
  'only',
  'come',
  'does',
  'each',
  'make',
  'most',
  'many',
  'their',
  'would',
  'could',
  'should',
  'these',
  'those',
  'where',
  'which',
  'while',
  'other',
  'after',
  'before',
  'because',
  'still',
  'thought',
  'never',
  'every',
  'being',
  'going',
  'take',
  'made',
  'same',
  'found',
  'keep',
  'says',
  'help',
  'give',
  'year',
  'well',
  'work',
  'real',
  'right',
])

function extractContentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  )
}

export function scoreSituationalRelevance(
  content: DayContent,
  reflection: string,
  theme: string,
): DimensionResult {
  const sourceWords = extractContentWords(`${reflection} ${theme}`)
  if (sourceWords.size === 0) {
    return {
      pass: true,
      detail:
        'reflection/theme too short to extract content words; skipping relevance check',
    }
  }

  const bodyWords = extractContentWords(content.textB ?? '')
  const overlap = [...sourceWords].filter((w) => bodyWords.has(w))
  const overlapCount = overlap.length
  const overlapRate = overlapCount / sourceWords.size

  const THRESHOLD_COUNT = 3
  const THRESHOLD_RATE = 0.15

  if (overlapCount >= THRESHOLD_COUNT || overlapRate >= THRESHOLD_RATE) {
    return {
      pass: true,
      detail: `${overlapCount}/${sourceWords.size} content words overlap (${(overlapRate * 100).toFixed(0)}%). Sample: ${overlap.slice(0, 5).join(', ')}`,
    }
  }
  return {
    pass: false,
    detail: `only ${overlapCount}/${sourceWords.size} content words overlap (${(overlapRate * 100).toFixed(0)}%) — body may be generic. Missing: ${[
      ...sourceWords,
    ]
      .filter((w) => !bodyWords.has(w))
      .slice(0, 8)
      .join(', ')}`,
  }
}

// ─── Dimension E: LLM voice check (STUBBED) ──────────────────────────────────

/**
 * Checks whether RUN_SOULAUDIT_LLM_RUBRIC=1 and ANTHROPIC_API_KEY are set.
 * Returns null (skip) otherwise.
 *
 * STUB: actual LLM call is intentionally NOT wired — to enable, implement
 * `callLlmRubric(content, reflection)` using the Anthropic SDK and return
 * a { pass: boolean, detail: string } object. The flag gate and null-skip
 * contract below must be preserved so the smoke suite stays CI-safe.
 *
 * Rubric prompt (to implement):
 *   "Read this generated devotional body. Does it (a) speak directly to the
 *    person's stated struggle rather than addressing a generic audience?
 *    (b) contain at least one creedal or christological anchor (Incarnation,
 *    Cross, Resurrection, or Grace)? (c) avoid hollow clichés ("just trust God",
 *    "God has a plan")? Reply: PASS or FAIL, then one sentence of evidence."
 */
export async function scoreLlmVoice(
  _content: DayContent,
  _reflection: string,
): Promise<DimensionResult | null> {
  const flagSet = process.env.RUN_SOULAUDIT_LLM_RUBRIC === '1'
  const keySet =
    typeof process.env.ANTHROPIC_API_KEY === 'string' &&
    process.env.ANTHROPIC_API_KEY.trim().length > 0

  if (!flagSet || !keySet) {
    // Graceful skip — do not fail CI
    return null
  }

  // STUB: replace this block with a real Anthropic API call
  // Example structure (not wired):
  //   const client = new Anthropic()
  //   const response = await client.messages.create({ ... })
  //   const verdict = response.content[0].text.trim()
  //   const pass = verdict.toUpperCase().startsWith('PASS')
  //   return { pass, detail: verdict }

  return {
    pass: false,
    detail:
      'LLM_RUBRIC flag is set but scoreLlmVoice is not implemented — wire callLlmRubric() to enable',
  }
}

// ─── Main scorer ──────────────────────────────────────────────────────────────

/**
 * Score a generated DayContent against all rubric dimensions.
 *
 * @param content    The DayContent object returned by generateGroundedDay
 * @param reflection The raw reflection text the person submitted
 * @param theme      The theme string used as input to generateGroundedDay
 */
export async function scoreContent(
  content: DayContent,
  reflection: string,
  theme: string,
): Promise<RubricResult> {
  const scripture_present = scoreScripturePresent(content)
  const source_present = scoreSourcePresent(content)
  const structure_conformance = scoreStructureConformance(content)
  const situational_relevance = scoreSituationalRelevance(
    content,
    reflection,
    theme,
  )
  const llm_voice_check = await scoreLlmVoice(content, reflection)

  const mandatoryDimensions = [
    scripture_present,
    source_present,
    structure_conformance,
    situational_relevance,
  ]

  // LLM dimension only fails overall when it's actively wired AND returns false
  const llmFails = llm_voice_check !== null && !llm_voice_check.pass

  const overall = mandatoryDimensions.every((d) => d.pass) && !llmFails

  return {
    scripture_present,
    source_present,
    structure_conformance,
    situational_relevance,
    llm_voice_check,
    overall,
  }
}

/**
 * Summarize a RubricResult as a human-readable string for test output.
 */
export function formatRubricResult(result: RubricResult): string {
  const dims: Array<[string, DimensionResult | null]> = [
    ['A:scripture_present', result.scripture_present],
    ['B:source_present', result.source_present],
    ['C:structure_conformance', result.structure_conformance],
    ['D:situational_relevance', result.situational_relevance],
    ['E:llm_voice_check', result.llm_voice_check],
  ]
  const lines = dims.map(([name, d]) => {
    if (d === null) return `  ${name}: SKIPPED`
    return `  ${name}: ${d.pass ? 'PASS' : 'FAIL'} — ${d.detail}`
  })
  return [`overall: ${result.overall ? 'PASS' : 'FAIL'}`, ...lines].join('\n')
}
