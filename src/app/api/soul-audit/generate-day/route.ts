/**
 * /api/soul-audit/generate-day
 *
 * INTERNAL-ONLY route protected by X-Internal-Secret header.
 * Generates one day of a devotional plan using the reference library + LLM.
 *
 * Flow:
 *   1. Validate internal secret
 *   2. Load reference index (module-cached, 5,114 chunks)
 *   3. BM25 score all chunks against query with diversity penalty
 *   4. Build LLM system prompt with reference material
 *   5. Call generateWithBrain for LLM composition
 *   6. Parse response, upsert day into devotional_plan_days
 *   7. On day 5: compose recap (day 6) + sabbath (day 7) deterministically
 *   8. Update job status throughout
 *
 * No fire-and-forget chaining (USING_QUEUE_FALLBACK=true).
 * The /status polling handler triggers the next day.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import { loadReferenceIndex } from '@/lib/soul-audit/reference-index-loader'
import { generateWithBrain } from '@/lib/brain/router'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createRequestId,
  isAbortError,
  jsonError,
  LLM_ROUTE_DEADLINE_MS,
  logApiError,
  withAbortDeadline,
} from '@/lib/api-security'
import type { BaseChunk } from '@/lib/soul-audit/reference-utils'
import type { DayContent } from '@/types/soul-audit-plan'

// ─── Request shape ───────────────────────────────────────────────────

interface GenerateDayRequest {
  jobId: string
  planId: string // This is actually plan_token
  runId: string
  dayNumber: number
  totalContentDays: number // 5
  theme: string
  scriptureAnchor: string
  userInput: string
  previousDaysSummary: string
  usedChunkIds: string[]
  interactiveElement: string
  metaStoryPosition: string
  timezone: string
  timezoneOffsetMinutes: number
  sessionId: string // session_token
}

// ─── BM25 scoring ────────────────────────────────────────────────────

function bm25Score(
  query: string,
  doc: string,
  k1 = 1.5,
  b = 0.75,
  avgDl = 500,
): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const docTerms = doc.toLowerCase().split(/\s+/)
  const dl = docTerms.length
  const tf = new Map<string, number>()
  for (const t of docTerms) tf.set(t, (tf.get(t) || 0) + 1)
  let score = 0
  for (const qt of queryTerms) {
    const f = tf.get(qt) || 0
    if (f === 0) continue
    score += (f * (k1 + 1)) / (f + k1 * (1 - b + (b * dl) / avgDl))
  }
  return score
}

function applyDiversityPenalty(
  scores: Map<string, number>,
  usedChunkIds: string[],
): Map<string, number> {
  const penalized = new Map(scores)
  for (const [id, score] of penalized) {
    if (usedChunkIds.includes(id)) penalized.set(id, score * 0.3)
  }
  return penalized
}

function selectTopChunks(
  chunks: BaseChunk[],
  query: string,
  usedChunkIds: string[],
  topK: number,
  minScore: number,
  minRequired: number,
): { selected: BaseChunk[]; selectedIds: string[] } {
  // Score all chunks
  const rawScores = new Map<string, number>()
  for (const chunk of chunks) {
    const text = [
      chunk.title,
      chunk.content,
      chunk.contextualSummary ?? '',
      chunk.keywords.join(' '),
      chunk.scriptureRefs.join(' '),
    ].join(' ')
    rawScores.set(chunk.id, bm25Score(query, text))
  }

  // Apply diversity penalty for previously used chunks
  const penalizedScores = applyDiversityPenalty(rawScores, usedChunkIds)

  // Sort by penalized score descending
  const sorted = [...penalizedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > minScore)
    .slice(0, topK)

  // If we don't meet minimum, relax the score threshold
  if (sorted.length < minRequired) {
    const relaxed = [...penalizedScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, minRequired)
    const relaxedIds = relaxed.map(([id]) => id)
    const relaxedChunks = relaxedIds
      .map((id) => chunks.find((c) => c.id === id))
      .filter((c): c is BaseChunk => c !== undefined)
    return { selected: relaxedChunks, selectedIds: relaxedIds }
  }

  const selectedIds = sorted.map(([id]) => id)
  const selected = selectedIds
    .map((id) => chunks.find((c) => c.id === id))
    .filter((c): c is BaseChunk => c !== undefined)
  return { selected, selectedIds }
}

// ─── LLM system prompt builder ───────────────────────────────────────

function buildSystemPrompt(params: {
  dayNumber: number
  userInput: string
  theme: string
  scriptureAnchor: string
  metaStoryPosition: string
  interactiveElement: string
  previousDaysSummary: string
  referenceChunks: BaseChunk[]
}): string {
  const refMaterial = params.referenceChunks
    .map(
      (chunk) =>
        `Source: ${chunk.source} / Title: ${chunk.title} / Content: ${chunk.content}`,
    )
    .join('\n\n')

  return `You are composing Day ${params.dayNumber} of a 5-day devotional for someone who said: "${params.userInput}"

Theme: ${params.theme} | Scripture: ${params.scriptureAnchor}

YOUR ROLE: Assembler and polisher. 80% from reference material below. Weave into structure. Add Hebrew/Greek word study. Write modern story hook for this person's struggle. One cohesive essay.

REFERENCE MATERIAL:
${refMaterial}

SECTION A — THE HOOK (400-500 words, 8th grade)
- Modern scene surfacing this person's tension
- Meta-story: "Today we are in [${params.metaStoryPosition}]"
- Interactive: ${params.interactiveElement}

SECTION B — THE TEXT (500-700 words, 12th grade)
- Quote ${params.scriptureAnchor} in full
- Historical/cultural context from reference material
- PaRDeS Peshat: literal meaning
- Also produce textBPreview: standalone 100-150 word summary for 5-minute readers

SECTION C — THE CENTER (700-900 words, college)
- Hebrew/Greek deep-dive: 2-3 words, transliteration, etymology, pictographic roots
- PaRDeS Remez: hints, allusions
- Reference source quote with FULL CONTEXT

SECTION B' — CHRIST CONNECTION (600-800 words, 12th grade)
- NT fulfillment, PaRDeS Drash: practical wisdom
- Second reference quote with context

SECTION A' — THE RETURN (400-600 words, 8th grade)
- Return to opening, transformed. PaRDeS Sod: mystery
- 3 specific reflection questions
- Closing prayer (3-5 sentences)
- Response invitation for ${params.interactiveElement}

ENDNOTES: Min 3 sources. Academic: Author. *Title*. Publisher, Year. Chapter/Page.

TIER 3 EXTENDED (separate fields):
- extendedEtymology, crossReferences (3-5), journalingPrompts (2-3), comprehensionQuestions (2-3), characterProfile (if relevant, else null), furtherResources (2-3 real books)

PREVIOUS DAYS: ${params.previousDaysSummary}

FORBIDDEN: "In today's world..." / "Let's unpack..." / "It's important to note..." / generic language / ungrounded theology / three-part lists / rhetorical question → immediate answer

TARGET: 3,000-4,000 words.

RESPOND WITH ONLY A JSON OBJECT. No preamble, no markdown fences.
Keys: title, hookA, textB, textBPreview, centerC, christConnectionBPrime, returnAPrime, scriptureReference, scriptureText, hebrewGreekStudy, interactiveElement, metaStoryPlacement, backwardLink, forwardLink, reflectionQuestions, prayer, endnotes, previousDaysSummaryForNext, tier3Extended`
}

// ─── LLM response parser ─────────────────────────────────────────────

function parseLLMResponse(raw: string): DayContent {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```'))
    cleaned = cleaned.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  const parsed = JSON.parse(cleaned)
  const required = [
    'title',
    'hookA',
    'textB',
    'textBPreview',
    'centerC',
    'christConnectionBPrime',
    'returnAPrime',
    'scriptureReference',
    'reflectionQuestions',
    'prayer',
    'endnotes',
  ]
  for (const f of required) {
    if (parsed[f] === undefined || parsed[f] === null)
      throw new Error(`Missing required field: ${f}`)
  }
  return parsed as DayContent
}

// ─── Recap Day 6 (deterministic) ────────────────────────────────────

function composeRecap(
  savedDays: Array<{ day_number: number; content: DayContent }>,
  planTheme: string,
): DayContent {
  const textB = savedDays
    .filter((d) => d.day_number <= 5)
    .map((d) => {
      const c = d.content
      const summary =
        c.previousDaysSummaryForNext || `${c.title} — ${c.scriptureReference}`
      return `**Day ${d.day_number}: ${c.title}** — ${c.scriptureReference}\n${summary}`
    })
    .join('\n\n')

  return {
    title: 'Week in Review',
    hookA: `This week you explored "${planTheme}." Here's what God revealed.`,
    textB,
    textBPreview: `A reflection on your five-day journey through ${planTheme}.`,
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime:
      "Review your journal entries, revisit a day that struck you, or sit in what you've received.",
    scriptureReference: '',
    scriptureText: '',
    hebrewGreekStudy: null,
    interactiveElement: {
      type: 'weekly_review',
      content: 'Which day challenged you most? Which gave you peace?',
    },
    metaStoryPlacement: '',
    backwardLink: `This week covered days 1-5 of ${planTheme}.`,
    forwardLink: 'Tomorrow is Sabbath. Rest.',
    reflectionQuestions: [
      'Which scripture stayed with you?',
      'What shifted in your understanding?',
      'What will you carry forward?',
    ],
    prayer:
      'Lord, thank you for this week of walking with Your word. Seal what You have spoken. Let it bear fruit in the days ahead. Amen.',
    endnotes: [],
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

// ─── Sabbath Day 7 (deterministic constant) ──────────────────────────

const SABBATH_DAY: DayContent = {
  title: 'Sabbath Rest',
  hookA:
    'Today is Sabbath. No new content. Just rest.\n\nYou spent five days in the Word and one in review. Now be still.',
  textB:
    '"Be still, and know that I am God; I will be exalted among the nations." — Psalm 46:10',
  textBPreview: 'Be still, and know that I am God. — Psalm 46:10',
  centerC: '',
  christConnectionBPrime: '',
  returnAPrime: '',
  scriptureReference: 'Psalm 46:10',
  scriptureText:
    'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.',
  hebrewGreekStudy: null,
  interactiveElement: {
    type: 'sabbath_silence',
    content: 'Set a timer for 5 minutes. Sit in silence. You are held.',
  },
  metaStoryPlacement: '',
  backwardLink:
    'This week you walked through five days of devotion and one of review.',
  forwardLink: '',
  reflectionQuestions: [
    'What moment from this week do you most want to carry into the next?',
  ],
  prayer: '',
  endnotes: [],
  previousDaysSummaryForNext: '',
  tier3Extended: null,
}

// ─── Job update helpers ──────────────────────────────────────────────

async function updateJob(
  jobId: string,
  fields: Partial<{
    status: string
    progress: string
    current_day: number
    error: string | null
    generating_since: string | null
  }>,
): Promise<void> {
  const supabase = createAdminClient()
  // soul_audit_jobs table exists in Supabase but is not yet in the
  // generated Database type. Cast to bypass the type-check until
  // the types are regenerated.

  const { error } = await (supabase as any)
    .from('soul_audit_jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) {
    console.error(
      `[generate-day] Failed to update job ${jobId}:`,
      error.message,
    )
  }
}

// ─── POST handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  // Step 1: Validate internal secret
  if (!validateInternalSecret(request)) {
    return jsonError({
      error: 'Forbidden',
      status: 403,
      requestId,
      code: 'INTERNAL_SECRET_REQUIRED',
    })
  }

  // Step 2: Parse JSON body
  let body: GenerateDayRequest
  try {
    body = (await request.json()) as GenerateDayRequest
  } catch (error) {
    logApiError({
      scope: 'soul-audit-generate-day',
      requestId,
      error,
      method: request.method,
      path: '/api/soul-audit/generate-day',
      context: { reason: 'invalid-json-body' },
    })
    return jsonError({
      error: 'Invalid JSON body',
      status: 400,
      requestId,
      code: 'INVALID_JSON_BODY',
    })
  }

  const {
    jobId,
    planId,
    runId,
    dayNumber,
    totalContentDays,
    theme,
    scriptureAnchor,
    userInput,
    previousDaysSummary,
    usedChunkIds,
    interactiveElement,
    metaStoryPosition,
  } = body

  if (!jobId || !planId || !runId || !dayNumber || !userInput) {
    return jsonError({
      error: 'Missing required fields',
      status: 400,
      requestId,
      code: 'INVALID_FIELDS',
    })
  }

  const contentDays = totalContentDays || 5

  try {
    // Step 3: Update job — generating
    await updateJob(jobId, {
      status: 'generating',
      progress: `Composing day ${dayNumber} of 7...`,
      generating_since: new Date().toISOString(),
    })

    // Step 4: Load reference index (module-cached)
    const chunks = await loadReferenceIndex()

    // Step 5: BM25 scoring with diversity penalty
    const query = `${userInput} ${theme} ${scriptureAnchor}`
    const { selected: referenceChunks, selectedIds: selectedChunkIds } =
      selectTopChunks(chunks, query, usedChunkIds || [], 8, 0.1, 5)

    console.info(
      `[generate-day] Day ${dayNumber} — ${referenceChunks.length} reference chunks selected (${chunks.length} total)`,
    )

    // Step 6: Build LLM system prompt
    const systemPrompt = buildSystemPrompt({
      dayNumber,
      userInput,
      theme: theme || '',
      scriptureAnchor: scriptureAnchor || '',
      metaStoryPosition: metaStoryPosition || '',
      interactiveElement: interactiveElement || '',
      previousDaysSummary: previousDaysSummary || '',
      referenceChunks,
    })

    // Step 7: Call LLM with a 25s wall-clock deadline so a slow provider
    // surfaces a structured 504 here instead of being silently killed by
    // the Workers 30s wall-clock cap and leaving generating_since set.
    let result
    try {
      result = await withAbortDeadline(LLM_ROUTE_DEADLINE_MS, (signal) =>
        generateWithBrain({
          system: systemPrompt,
          messages: [{ role: 'user', content: 'Generate the devotional day.' }],
          context: {
            task: 'devotional_day_generate',
            mode: 'auto',
            maxOutputTokens: 6000,
            platformKeysEnabled: true,
            signal,
          },
        }),
      )
    } catch (error) {
      if (isAbortError(error)) {
        logApiError({
          scope: 'soul-audit-generate-day',
          requestId,
          error,
          method: request.method,
          path: '/api/soul-audit/generate-day',
          context: {
            reason: 'llm-deadline-exceeded',
            dayNumber,
            jobId,
            deadlineMs: LLM_ROUTE_DEADLINE_MS,
          },
        })
        await updateJob(jobId, {
          status: 'error',
          error: `Day ${dayNumber} generation took too long (${LLM_ROUTE_DEADLINE_MS}ms deadline).`,
          generating_since: null,
        }).catch(() => {})
        return jsonError({
          error: `Day ${dayNumber} generation took too long.`,
          status: 504,
          requestId,
          code: 'LLM_DEADLINE_EXCEEDED',
        })
      }
      throw error
    }

    // Step 8: Parse response
    let parsed: DayContent
    try {
      parsed = parseLLMResponse(result.output)
    } catch (parseError) {
      const parseMessage =
        parseError instanceof Error
          ? parseError.message
          : 'LLM response parse failed'
      console.error(
        `[generate-day] Parse failed for day ${dayNumber}:`,
        parseMessage,
        'Raw output (first 500 chars):',
        result.output.slice(0, 500),
      )
      await updateJob(jobId, {
        status: 'error',
        error: `Day ${dayNumber} parse failed: ${parseMessage}`,
        generating_since: null,
      })
      return NextResponse.json(
        { error: `Day ${dayNumber} parse failed: ${parseMessage}` },
        { status: 500 },
      )
    }

    // Step 9: Upsert day into devotional_plan_days
    // The local Database type is missing used_chunk_ids and run_id columns
    // that exist in Supabase. Cast to bypass until types are regenerated.
    const supabase = createAdminClient()

    const db = supabase as any
    const { error: upsertError } = await db.from('devotional_plan_days').upsert(
      {
        plan_token: planId,
        day_number: dayNumber,
        content: parsed as unknown as Record<string, unknown>,
        used_chunk_ids: selectedChunkIds,
        run_id: runId,
      },
      { onConflict: 'plan_token,day_number' },
    )

    if (upsertError) {
      console.error(
        `[generate-day] Upsert failed for day ${dayNumber}:`,
        upsertError.message,
      )
      await updateJob(jobId, {
        status: 'error',
        error: `Day ${dayNumber} save failed: ${upsertError.message}`,
        generating_since: null,
      })
      return NextResponse.json(
        { error: `Day ${dayNumber} save failed` },
        { status: 500 },
      )
    }

    // Step 10: Update job — current_day
    await updateJob(jobId, {
      current_day: dayNumber,
      progress: `Day ${dayNumber} of 7 complete.`,
    })

    // Step 11/12: If this is the last content day, compose recap + sabbath
    if (dayNumber >= contentDays) {
      // Fetch all saved content days for recap composition
      const { data: savedDays } = await db
        .from('devotional_plan_days')
        .select('day_number, content')
        .eq('plan_token', planId)
        .order('day_number')

      const typedSavedDays = (
        (savedDays || []) as Array<{
          day_number: number
          content: Record<string, unknown>
        }>
      ).map((d) => ({
        day_number: d.day_number,
        content: d.content as unknown as DayContent,
      }))

      // Compose recap (day 6)
      const recapContent = composeRecap(typedSavedDays, theme || 'your journey')

      const { error: recapError } = await db
        .from('devotional_plan_days')
        .upsert(
          {
            plan_token: planId,
            day_number: 6,
            content: recapContent as unknown as Record<string, unknown>,
            used_chunk_ids: [],
            run_id: runId,
          },
          { onConflict: 'plan_token,day_number' },
        )

      if (recapError) {
        console.error('[generate-day] Recap upsert failed:', recapError.message)
        await updateJob(jobId, {
          status: 'error',
          error: `Recap day save failed: ${recapError.message}`,
          generating_since: null,
        })
        return NextResponse.json(
          { error: 'Recap day save failed' },
          { status: 500 },
        )
      }

      // Compose sabbath (day 7)
      const { error: sabbathError } = await db
        .from('devotional_plan_days')
        .upsert(
          {
            plan_token: planId,
            day_number: 7,
            content: SABBATH_DAY as unknown as Record<string, unknown>,
            used_chunk_ids: [],
            run_id: runId,
          },
          { onConflict: 'plan_token,day_number' },
        )

      if (sabbathError) {
        console.error(
          '[generate-day] Sabbath upsert failed:',
          sabbathError.message,
        )
        await updateJob(jobId, {
          status: 'error',
          error: `Sabbath day save failed: ${sabbathError.message}`,
          generating_since: null,
        })
        return NextResponse.json(
          { error: 'Sabbath day save failed' },
          { status: 500 },
        )
      }

      // Mark job complete
      await updateJob(jobId, {
        status: 'complete',
        current_day: 7,
        progress: 'All 7 days generated.',
        generating_since: null,
      })

      console.info(
        `[generate-day] Plan ${planId} complete — all 7 days generated.`,
      )

      return NextResponse.json({
        ok: true,
        dayNumber,
        complete: true,
        totalDaysGenerated: 7,
      })
    }

    // Not the final content day — stop here. /status polling triggers next day.
    console.info(
      `[generate-day] Day ${dayNumber} saved for plan ${planId}. Waiting for /status to trigger day ${dayNumber + 1}.`,
    )

    return NextResponse.json({
      ok: true,
      dayNumber,
      complete: false,
      nextDay: dayNumber + 1,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown generation error'
    console.error(
      `[generate-day] Fatal error on day ${dayNumber} for job ${jobId}:`,
      message,
    )
    await updateJob(jobId, {
      status: 'error',
      error: `Day ${dayNumber} failed: ${message}`,
      generating_since: null,
    }).catch((updateErr) =>
      console.error(
        '[generate-day] Could not update job to error state:',
        updateErr,
      ),
    )
    return NextResponse.json(
      { error: `Day ${dayNumber} generation failed: ${message}` },
      { status: 500 },
    )
  }
}
