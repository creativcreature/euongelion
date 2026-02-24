function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const brainFlags = {
  brainRouterEnabled: toBool(process.env.BRAIN_ROUTER_ENABLED, true),
  brainSwitchUiEnabled: toBool(process.env.BRAIN_SWITCH_UI_ENABLED, true),
  openWebModeEnabled: toBool(process.env.OPEN_WEB_MODE_ENABLED, true),
  chatStudySidebarEnabled: toBool(
    process.env.CHAT_STUDY_SIDEBAR_V2_ENABLED,
    true,
  ),
  qualityFloor: toNumber(process.env.BRAIN_QUALITY_FLOOR, 0.65),
  freeChatMonthlyCap: Math.max(
    1,
    Math.round(toNumber(process.env.FREE_CHAT_MONTHLY_CAP, 20)),
  ),
  subscriptionChatMonthlyCredit: Math.max(
    1,
    Math.round(toNumber(process.env.SUBSCRIPTION_CHAT_MONTHLY_CREDIT, 1000)),
  ),
  platformMonthlyBudgetUsd: Math.max(
    1,
    toNumber(process.env.PLATFORM_AI_BUDGET_MONTHLY_USD, 100),
  ),
  nearLimitThreshold: toNumber(process.env.CHAT_NEAR_LIMIT_THRESHOLD, 0.8),

  // ─── Token Optimization Flags ────────────────────────────────────
  // Defaults are cost-optimized. Set to true for premium/higher quality.

  /** Use LLM for Sabbath/Review days (default: false = deterministic templates) */
  generativeSabbathReview: toBool(process.env.GENERATIVE_SABBATH_REVIEW, false),

  /** Use LLM for intent parsing (default: false = deterministic keyword parser) */
  llmIntentParsing: toBool(process.env.LLM_INTENT_PARSING, false),

  /** Use LLM doc reranking in polishing (default: false = keyword ordering) */
  llmDocReranking: toBool(process.env.LLM_DOC_RERANKING, false),

  /** Cache outline generation results (default: true) */
  outlineCacheEnabled: toBool(process.env.OUTLINE_CACHE_ENABLED, true),

  /** Max reference chunks per devotional day (default: 4, was 6-12) */
  maxReferenceChunksPerDay: Math.max(
    2,
    Math.round(toNumber(process.env.MAX_REFERENCE_CHUNKS_PER_DAY, 4)),
  ),

  /** Max characters per reference chunk in LLM context (default: 1200) */
  maxChunkCharsInContext: Math.max(
    400,
    Math.round(toNumber(process.env.MAX_CHUNK_CHARS_IN_CONTEXT, 1200)),
  ),
}
