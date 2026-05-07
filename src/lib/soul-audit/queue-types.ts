/**
 * queue-types.ts — Phase 5 async runtime message shapes.
 *
 * Shared between the producer (`/api/soul-audit/select` enqueues),
 * the consumer (Worker queue handler dispatches), and the Durable
 * Object (PlanOrchestrator stores progress). Keeping the types in
 * one file means a queue contract change errors at compile time
 * everywhere.
 *
 * See docs/runbooks/phase5-async-runtime.md for the full design.
 */

export type SoulAuditQueueMessage =
  | { type: 'compose_full_plan'; payload: ComposeFullPlanPayload }
  | { type: 'compose_one_day'; payload: ComposeOneDayPayload }

export interface ComposeFullPlanPayload {
  /** Soul Audit job id (links back to the soul_audit_jobs row). */
  jobId: string
  /** Plan token (durable identifier for the plan). */
  planToken: string
  /** Audit run id. */
  runId: string
  /** Session token (for RLS-scoped writes). */
  sessionToken: string
  /** User's reflection text. */
  userInput: string
  /** Series theme (for prompt context). */
  theme: string
  /** Anchor scripture reference for Day 1. */
  scriptureAnchor: string
  /** Total content days to generate (default 5; days 6-7 are recap+sabbath). */
  totalContentDays: number
  /** User's IANA timezone. */
  timezone: string
  /** Numeric offset in minutes for cycle scheduling. */
  timezoneOffsetMinutes: number
}

export interface ComposeOneDayPayload {
  jobId: string
  planToken: string
  runId: string
  sessionToken: string
  dayNumber: number
  totalContentDays: number
  theme: string
  scriptureAnchor: string
  userInput: string
  /** Used chunk ids from previous days (for diversity). */
  usedChunkIds: string[]
  /** Summary of previous days for context. */
  previousDaysSummary: string
  /** Interactive element rotation slot. */
  interactiveElement: string
  /** Meta-story position label. */
  metaStoryPosition: string
}

/**
 * Durable Object orchestration state — what PlanOrchestrator stores
 * per plan_token. Persisted across the multi-day generation. Read
 * by the status endpoint to surface progress to the client.
 */
export interface PlanOrchestrationState {
  jobId: string
  planToken: string
  status: 'pending' | 'generating' | 'complete' | 'error' | 'stalled'
  /** Day currently being generated (1..7). */
  currentDay: number
  /** Days successfully written. */
  daysCompleted: number[]
  /** Total content days planned. */
  totalContentDays: number
  /** ISO timestamp of last activity. */
  lastUpdatedAt: string
  /** Error message if status === 'error'. */
  error?: string
  /** Free-form progress label for UI ("Composing day 3..."). */
  progressLabel?: string
}
