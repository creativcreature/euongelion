export const MAX_AUDITS_PER_CYCLE = 3

export const SOUL_AUDIT_OPTION_SPLIT = {
  aiPrimary: 3,
  curatedPrefab: 2,
  total: 5,
} as const

export const CURATED_SOURCE_PRIORITY = [
  'content/approved',
  'content/final',
  'content/series-json',
] as const

export const CRISIS_KEYWORDS = [
  'suicide',
  'suicidal',
  'kill myself',
  'end my life',
  "don't want to live",
  "don't want to be here",
  'want to die',
  'better off dead',
  'no reason to live',
  'self harm',
  'self-harm',
  'cutting myself',
  'hurt myself',
  'abuse',
  'hits me',
  'beats me',
  'domestic violence',
]

export const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', contact: 'Call or Text 988' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
]

export const CRISIS_ACK_PROMPT =
  'Before continuing, please acknowledge these crisis resources.'

export const PREFAB_FALLBACK_SLUGS = ['identity', 'peace', 'community']

// ─── Plan Generation Constants ──────────────────────────────────────

export const INTERACTIVE_ROTATION: Record<number, string> = {
  1: 'breath_prayer',
  2: 'journaling_prompt',
  3: 'physical_practice',
  4: 'scripture_memory',
  5: 'art_response',
  6: 'weekly_review',
  7: 'sabbath_silence',
}

/** True when relay chain fails and we use client-driven polling. */
export const USING_QUEUE_FALLBACK = true

/** Maximum time (ms) before a generating job is considered stalled. */
export const STALL_TIMEOUT_MS = 2 * 60 * 1000

/** Advisory lock timeout (ms) for generating_since. */
export const GENERATING_LOCK_TIMEOUT_MS = 60 * 1000

/** Number of content days (not counting recap + sabbath). */
export const TOTAL_CONTENT_DAYS = 5

/** Total days including recap + sabbath. */
export const TOTAL_PLAN_DAYS = 7

/** BM25 top-k chunks per day for LLM context. */
export const CHUNKS_PER_DAY = 8

/** Minimum BM25 score threshold. */
export const MIN_CHUNK_SCORE = 0.1

/** Minimum chunks before we send to LLM. */
export const MIN_CHUNKS = 5

/** Max tokens for LLM output. */
export const LLM_MAX_TOKENS = 6000

/** Poll interval for client (ms). */
export const POLL_INTERVAL_MS = 2500
