// Runtime-agnostic plan-generation orchestration.
//
// One source of truth for "generate a day of a plan", shared by every
// executor so behavior never drifts between runtimes:
//   1. the Next.js /api/soul-audit/generate-day route (Workers, deadline-bound)
//   2. scripts/dev-generator-server.mts (local Node stand-in for the Edge fn)
//   3. supabase/functions/generate-plan-day (Deno Edge — no request deadline,
//      which is what lets Sonnet's ~40s readings run on the free tier)
//
// The runner owns: grounded weave -> verification gate -> day upsert -> job
// progress -> recap/sabbath finalize. Executors own: transport, auth, and
// chaining (the route leaves chaining to /status polling; the shim/Edge
// self-chain after responding).
import { generateGroundedDay } from './grounded-weave'
import { composeRecap, SABBATH_DAY } from './plan-composition'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkDailyBudget, budgetPausedMessage } from './budget-cap'
import { recordGenerationUsage } from './cost-ledger'
import { emitSoulAuditTelemetry } from './telemetry'
import type { DayContent, Tier3Extended } from '@/types/soul-audit-plan'

export interface GenerateDayJob {
  jobId: string
  planId: string // plan_token
  runId: string
  dayNumber: number
  totalContentDays: number // 5
  theme: string
  scriptureAnchor: string
  userInput: string
  previousDaysSummary: string
  usedChunkIds: string[]
  sessionId?: string
  signal?: AbortSignal
}

export type RunnerResult =
  | {
      ok: true
      complete: boolean
      nextDay: number | null
      /**
       * Continuity payload for the executor that chains the next day:
       * accumulated previous-day summaries + used chunk ids (diversity
       * penalty). Mirrors what /status reconstructs from saved rows.
       */
      chain: { previousDaysSummary: string; usedChunkIds: string[] } | null
    }
  | { ok: false; status: number; error: string }

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
  // soul_audit_jobs is not yet in the generated Database types.

  const { error } = await (supabase as any)
    .from('soul_audit_jobs')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) {
    console.error(
      `[generation-runner] Failed to update job ${jobId}:`,
      error.message,
    )
  }
}

/**
 * Generate ONE day of a plan: grounded weave, verification gate, save,
 * job-progress update, and (after the final content day) the deterministic
 * recap + sabbath finalize. Throws nothing — every failure path is a
 * structured RunnerResult so executors map it to their transport.
 */
export async function runGenerationDay(
  job: GenerateDayJob,
): Promise<RunnerResult> {
  const { jobId, planId, runId, dayNumber } = job
  const contentDays = job.totalContentDays || 5
  const startedAt = Date.now()

  try {
    // ── BLOCKING budget cap ──────────────────────────────────────────────
    // Check the day's accumulated LLM spend BEFORE making the (expensive)
    // generation call. When the daily ceiling is reached, generation is
    // paused with a clear, honest error — never canned/fabricated content.
    // This runs in every executor (Worker route, dev shim, Edge function)
    // because the runner is the shared source of truth.
    const budget = await checkDailyBudget()
    if (!budget.ok) {
      emitSoulAuditTelemetry('budget_exceeded', {
        dayNumber,
        jobId,
        planToken: planId,
        sessionToken: job.sessionId,
        reason: budget.reason,
        observed: budget.spendUsd,
        ceiling: budget.costCeilingUsd,
      })
      const pausedMessage = budgetPausedMessage(budget.reason)
      await updateJob(jobId, {
        status: 'error',
        error: pausedMessage,
        generating_since: null,
      }).catch(() => {})
      return { ok: false, status: 429, error: pausedMessage }
    }

    await updateJob(jobId, {
      status: 'generating',
      progress: `Composing day ${dayNumber} of 7...`,
      generating_since: new Date().toISOString(),
    })

    emitSoulAuditTelemetry('generation_start', {
      mode: 'reading',
      dayNumber,
      jobId,
      planToken: planId,
      sessionToken: job.sessionId,
    })

    // Grounded closed-RAG weave (verbatim Scripture + real attributed quotes
    // + lexicon word studies), woven by Sonnet, verification-gated.
    let weave
    try {
      weave = await generateGroundedDay({
        struggle: job.userInput,
        scriptureReference: job.scriptureAnchor || '',
        theme: job.theme || '',
        dayNumber,
        totalDays: 7,
        previousDaysSummary: job.previousDaysSummary || '',
        usedChunkIds: job.usedChunkIds || [],
        mode: 'reading',
        modelOverride: process.env.SOUL_AUDIT_MODEL || undefined,
        signal: job.signal,
      })
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'grounded weave failed'
      console.error(
        `[generation-runner] Grounded weave failed for day ${dayNumber}:`,
        msg,
      )
      await updateJob(jobId, {
        status: 'error',
        error: `Day ${dayNumber} generation failed: ${msg}`,
        generating_since: null,
      }).catch(() => {})
      // Abort errors surface as 504 so the route keeps its deadline contract.
      const isAbort =
        error instanceof Error &&
        (error.name === 'AbortError' || msg.includes('aborted'))
      emitSoulAuditTelemetry('generation_fail', {
        mode: 'reading',
        dayNumber,
        jobId,
        planToken: planId,
        sessionToken: job.sessionId,
        durationMs: Date.now() - startedAt,
        reason: `weave_failed: ${msg}`,
      })
      return {
        ok: false,
        status: isAbort ? 504 : 500,
        error: `Day ${dayNumber} generation failed: ${msg}`,
      }
    }

    // Cost ledger (OBSERVABILITY ONLY — best-effort-but-LOUD): the tokens were
    // already spent the moment the weave call returned, so record usage here,
    // BEFORE the verification gate, regardless of whether the day is accepted.
    // recordGenerationUsage never throws: a ledger failure must never break the
    // user's devotional, so we never let it short-circuit the path below.
    await recordGenerationUsage({
      model: weave.meta.model,
      inputTokens: weave.meta.inputTokens,
      outputTokens: weave.meta.outputTokens,
      dayMode: 'reading',
      sessionToken: job.sessionId,
      jobId,
      planToken: planId,
      runId,
      dayNumber,
    })

    // Grounding + depth gate — never save a day that smuggled in an ungrounded
    // citation OR came back thin/incomplete; reject so the chain re-rolls it.
    // Both checks live in weave.verification (F-027 grounding + F-028 depth).
    if (!weave.verification.ok) {
      const issues = weave.verification.issues.join('; ')
      console.error(
        `[generation-runner] Day ${dayNumber} failed verification (grounding/depth):`,
        issues,
      )
      emitSoulAuditTelemetry('generation_fail', {
        mode: 'reading',
        dayNumber,
        jobId,
        planToken: planId,
        sessionToken: job.sessionId,
        model: weave.meta.model,
        inputTokens: weave.meta.inputTokens,
        outputTokens: weave.meta.outputTokens,
        durationMs: Date.now() - startedAt,
        reason: `verification_failed: ${issues}`,
      })
      await updateJob(jobId, {
        status: 'error',
        error: `Day ${dayNumber} failed verification: ${issues}`,
        generating_since: null,
      })
      return {
        ok: false,
        status: 500,
        error: `verification failed: ${issues}`,
      }
    }

    const parsed: DayContent = weave.content
    console.info(
      `[generation-runner] Day ${dayNumber} grounded: ${weave.meta.words}w · ${weave.meta.sourceCount} sources · ${weave.meta.wordStudyCount} word studies · ${weave.meta.endnoteCount} endnotes · ${weave.meta.model} · verified`,
    )

    const supabase = createAdminClient()

    const db = supabase as any
    const { error: upsertError } = await db.from('devotional_plan_days').upsert(
      {
        plan_token: planId,
        day_number: dayNumber,
        content: parsed as unknown as Record<string, unknown>,
        used_chunk_ids: weave.usedChunkIds,
        run_id: runId,
      },
      { onConflict: 'plan_token,day_number' },
    )
    if (upsertError) {
      console.error(
        `[generation-runner] Upsert failed for day ${dayNumber}:`,
        upsertError.message,
      )
      await updateJob(jobId, {
        status: 'error',
        error: `Day ${dayNumber} save failed: ${upsertError.message}`,
        generating_since: null,
      })
      return { ok: false, status: 500, error: `Day ${dayNumber} save failed` }
    }

    await updateJob(jobId, {
      current_day: dayNumber,
      progress: `Day ${dayNumber} of 7 complete.`,
    })

    emitSoulAuditTelemetry('generation_success', {
      mode: 'reading',
      dayNumber,
      jobId,
      planToken: planId,
      sessionToken: job.sessionId,
      model: weave.meta.model,
      inputTokens: weave.meta.inputTokens,
      outputTokens: weave.meta.outputTokens,
      durationMs: Date.now() - startedAt,
    })

    // Final content day → recap (6) + sabbath (7) + complete.
    if (dayNumber >= contentDays) {
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

      const recapContent = composeRecap(
        typedSavedDays,
        job.theme || 'your journey',
      )

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
        console.error(
          '[generation-runner] Recap upsert failed:',
          recapError.message,
        )
        await updateJob(jobId, {
          status: 'error',
          error: `Recap day save failed: ${recapError.message}`,
          generating_since: null,
        })
        return { ok: false, status: 500, error: 'Recap day save failed' }
      }

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
          '[generation-runner] Sabbath upsert failed:',
          sabbathError.message,
        )
        await updateJob(jobId, {
          status: 'error',
          error: `Sabbath day save failed: ${sabbathError.message}`,
          generating_since: null,
        })
        return { ok: false, status: 500, error: 'Sabbath day save failed' }
      }

      await updateJob(jobId, {
        status: 'complete',
        current_day: 7,
        progress: 'All 7 days generated.',
        generating_since: null,
      })
      console.info(
        `[generation-runner] Plan ${planId} complete — all 7 days generated.`,
      )
      return { ok: true, complete: true, nextDay: null, chain: null }
    }

    console.info(
      `[generation-runner] Day ${dayNumber} saved for plan ${planId}.`,
    )
    const summarySoFar = [
      job.previousDaysSummary || '',
      `Day ${dayNumber}: ${parsed.previousDaysSummaryForNext || parsed.title}`,
    ]
      .filter(Boolean)
      .join(' ')
    return {
      ok: true,
      complete: false,
      nextDay: dayNumber + 1,
      chain: {
        previousDaysSummary: summarySoFar,
        usedChunkIds: [...(job.usedChunkIds || []), ...weave.usedChunkIds],
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown generation error'
    console.error(
      `[generation-runner] Fatal error on day ${dayNumber} for job ${jobId}:`,
      message,
    )
    await updateJob(jobId, {
      status: 'error',
      error: `Day ${dayNumber} failed: ${message}`,
      generating_since: null,
    }).catch((updateErr) =>
      console.error(
        '[generation-runner] Failed to record error state:',
        updateErr,
      ),
    )
    return { ok: false, status: 500, error: message }
  }
}

// ─── Deep Dive (on-demand, per day) ──────────────────────────────────

export interface DeepDiveJob {
  planId: string // plan_token
  dayNumber: number
  theme: string
  scriptureAnchor: string
  userInput: string
  signal?: AbortSignal
}

export type DeepDiveResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/**
 * Generate the ~3,500-word grounded Deep Dive for an already-generated day
 * and merge it into that day's saved content (tier3Extended + deepDiveBody).
 * Same closed-RAG weave + verification gate as the daily reading.
 */
export async function runDeepDive(job: DeepDiveJob): Promise<DeepDiveResult> {
  const supabase = createAdminClient()
  const startedAt = Date.now()

  const db = supabase as any

  const { data: dayRow, error: dayError } = await db
    .from('devotional_plan_days')
    .select('day_number, content, used_chunk_ids')
    .eq('plan_token', job.planId)
    .eq('day_number', job.dayNumber)
    .single()

  if (dayError || !dayRow) {
    return {
      ok: false,
      status: 404,
      error: `Day ${job.dayNumber} not found for plan.`,
    }
  }

  // BLOCKING budget cap — the deep dive is the single most expensive call
  // (~3,500 words / up to 7000 output tokens), so it must respect the daily
  // ceiling too. Paused, not faked. (Shared runner → enforced in every runtime.)
  const budget = await checkDailyBudget()
  if (!budget.ok) {
    emitSoulAuditTelemetry('budget_exceeded', {
      mode: 'deepdive',
      dayNumber: job.dayNumber,
      planToken: job.planId,
      reason: budget.reason,
      observed: budget.spendUsd,
      ceiling: budget.costCeilingUsd,
    })
    return { ok: false, status: 429, error: budgetPausedMessage(budget.reason) }
  }

  const existing = dayRow.content as unknown as DayContent

  emitSoulAuditTelemetry('generation_start', {
    mode: 'deepdive',
    dayNumber: job.dayNumber,
    planToken: job.planId,
  })

  let weave
  try {
    weave = await generateGroundedDay({
      struggle: job.userInput,
      scriptureReference:
        job.scriptureAnchor || existing.scriptureReference || '',
      theme: job.theme || '',
      dayNumber: job.dayNumber,
      totalDays: 7,
      usedChunkIds: (dayRow.used_chunk_ids as string[] | null) || [],
      mode: 'deepdive',
      modelOverride: process.env.SOUL_AUDIT_MODEL || undefined,
      signal: job.signal,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'deep dive failed'
    console.error(
      `[generation-runner] Deep dive failed for day ${job.dayNumber}:`,
      msg,
    )
    emitSoulAuditTelemetry('generation_fail', {
      mode: 'deepdive',
      dayNumber: job.dayNumber,
      planToken: job.planId,
      durationMs: Date.now() - startedAt,
      reason: `weave_failed: ${msg}`,
    })
    return { ok: false, status: 500, error: msg }
  }

  // Cost ledger (observability, best-effort-but-LOUD): tokens were spent on the
  // weave call above regardless of the verification outcome, so record first.
  await recordGenerationUsage({
    model: weave.meta.model,
    inputTokens: weave.meta.inputTokens,
    outputTokens: weave.meta.outputTokens,
    dayMode: 'deepdive',
    planToken: job.planId,
    dayNumber: job.dayNumber,
  })

  if (!weave.verification.ok) {
    const issues = weave.verification.issues.join('; ')
    console.error(
      `[generation-runner] Deep dive day ${job.dayNumber} failed verification (grounding/depth):`,
      issues,
    )
    emitSoulAuditTelemetry('generation_fail', {
      mode: 'deepdive',
      dayNumber: job.dayNumber,
      planToken: job.planId,
      model: weave.meta.model,
      inputTokens: weave.meta.inputTokens,
      outputTokens: weave.meta.outputTokens,
      durationMs: Date.now() - startedAt,
      reason: `verification_failed: ${issues}`,
    })
    return { ok: false, status: 500, error: `verification failed: ${issues}` }
  }

  const tier3: Tier3Extended = {
    ...(weave.content.tier3Extended ?? {
      extendedEtymology: '',
      crossReferences: [],
      journalingPrompts: [],
      comprehensionQuestions: [],
      characterProfile: null,
      furtherResources: [],
    }),
    deepDiveBody: weave.content.textB,
  }

  const merged: DayContent = { ...existing, tier3Extended: tier3 }

  const { error: saveError } = await db.from('devotional_plan_days').upsert(
    {
      plan_token: job.planId,
      day_number: job.dayNumber,
      content: merged as unknown as Record<string, unknown>,
      used_chunk_ids: dayRow.used_chunk_ids ?? [],
    },
    { onConflict: 'plan_token,day_number' },
  )
  if (saveError) {
    return { ok: false, status: 500, error: saveError.message }
  }

  console.info(
    `[generation-runner] Deep dive saved for plan ${job.planId} day ${job.dayNumber}: ${weave.meta.words}w · ${weave.meta.sourceCount} sources · verified`,
  )
  emitSoulAuditTelemetry('generation_success', {
    mode: 'deepdive',
    dayNumber: job.dayNumber,
    planToken: job.planId,
    model: weave.meta.model,
    inputTokens: weave.meta.inputTokens,
    outputTokens: weave.meta.outputTokens,
    durationMs: Date.now() - startedAt,
  })
  return { ok: true }
}
