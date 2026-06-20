export interface HebrewGreekStudy {
  word: string
  transliteration: string
  language: 'hebrew' | 'greek'
  meaning: string
  etymology: string
}

export interface InteractiveElement {
  type: string
  content: string
}

export interface Endnote {
  id: number
  source: string
  note: string
  /**
   * Structured classification of the grounded source this endnote attributes,
   * added for the grounded weave (F-027). Optional so legacy/curated producers
   * that emit plain `{id, source, note}` endnotes stay valid.
   *
   * - `scripture`  the verbatim anchor passage (ref + translation)
   * - `voice`      an attributed historic-voice quote actually woven into the body
   * - `lexicon`    a Hebrew/Greek word study grounded in a real lexicon entry
   */
  kind?: 'scripture' | 'voice' | 'lexicon'
  /**
   * Where in the day this source is used, e.g. a Scripture reference, a word's
   * Strong's number, or the attribution. Free-form, always derived from real
   * grounded material — never an invented citation.
   */
  reference?: string
}

export interface CrossReference {
  reference: string
  connection: string
}

export interface FurtherResource {
  type: 'book' | 'article' | 'commentary'
  title: string
  author: string
  note: string
}

export interface CharacterProfile {
  name: string
  title: string
  description: string
  lessonForUs: string
}

export interface Tier3Extended {
  extendedEtymology: string
  crossReferences: CrossReference[]
  journalingPrompts: string[]
  comprehensionQuestions: string[]
  characterProfile: CharacterProfile | null
  furtherResources: FurtherResource[]
  /**
   * The full long-form Deep Dive reading (~3,000-3,800 words, markdown),
   * generated on demand by the grounded weave's `deepdive` mode and merged
   * into the day's saved content. Optional: legacy days won't have it.
   */
  deepDiveBody?: string
}

export interface DayContent {
  title: string
  hookA: string
  textB: string
  textBPreview: string
  centerC: string
  christConnectionBPrime: string
  returnAPrime: string
  scriptureReference: string
  scriptureText: string
  hebrewGreekStudy: HebrewGreekStudy | null
  interactiveElement: InteractiveElement
  metaStoryPlacement: string
  backwardLink: string
  forwardLink: string
  reflectionQuestions: string[]
  prayer: string
  endnotes: Endnote[]
  previousDaysSummaryForNext: string
  tier3Extended: Tier3Extended | null
}

export interface DayScheduleEntry {
  day: number
  date: string
  unlock_at: string | null
  status: 'unlocked' | 'locked' | 'sabbath'
}

/**
 * Maps to `devotional_plan_instances` table.
 * Uses existing column names: session_token, audit_run_id, plan_token.
 */
export interface PlanRecord {
  id: string
  plan_token: string
  audit_run_id: string
  session_token: string
  series_slug: string
  timezone: string
  timezone_offset_minutes: number
  start_policy: string
  started_at: string
  cycle_start_at: string
  theme: string | null
  scripture_anchor: string | null
  schedule: DayScheduleEntry[]
  status: string
  created_at: string
  updated_at: string | null
}

/**
 * Maps to `devotional_plan_days` table.
 * Uses existing column name: plan_token (FK to plan_instances.plan_token).
 */
export interface PlanDayRecord {
  id: string
  plan_token: string
  day_number: number
  content: DayContent
  used_chunk_ids: string[]
  completed_at: string | null
  run_id: string | null
  created_at: string
}

export interface PlanWithDays extends PlanRecord {
  devotional_plan_days: PlanDayRecord[]
}

/**
 * Maps to `soul_audit_jobs` table (new table).
 * - session_id stores the session_token value from the cookie
 * - run_id stores the audit_run_id value
 * - plan_id stores the plan_token value (links to devotional_plan_days.plan_token)
 */
export interface JobRecord {
  id: string
  run_id: string
  session_id: string | null
  plan_id: string | null
  status: 'pending' | 'generating' | 'complete' | 'error' | 'stalled'
  progress: string | null
  current_day: number | null
  total_days: number
  theme: string | null
  scripture_anchor: string | null
  user_input: string | null
  timezone: string | null
  timezone_offset_minutes: number | null
  error: string | null
  generating_since: string | null
  created_at: string
  updated_at: string
}
