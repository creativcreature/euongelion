export interface AuditMatch {
  slug: string
  title: string
  question: string
  confidence: number
  reasoning: string
  preview?: {
    verse: string
    verseText?: string
    paragraph: string
    curationSeed?: {
      seriesSlug: string
      dayNumber: number
      candidateKey: string
    }
  } | null
}

export type AuditOptionKind = 'ai_primary' | 'ai_generative' | 'curated_prefab'

export interface AuditOptionPreview extends AuditMatch {
  id: string
  kind: AuditOptionKind
  rank: number
  /** For ai_generative options: the plan blueprint for day-by-day generation. */
  planOutline?: PlanOutlinePreview
}

export interface CrisisResource {
  name: string
  contact: string
}

export interface CrisisRequirement {
  required: boolean
  acknowledged: boolean
  resources: CrisisResource[]
  prompt: string
}

export interface SoulAuditSubmitResponseV2 {
  version: 'v2'
  auditRunId: string
  runToken: string
  inputGuidance?: string
  remainingAudits: number
  requiresEssentialConsent: true
  analyticsOptInDefault: false
  consentAccepted: boolean
  /** True when generation took >8s — lets client show a slow-gen message. */
  slowGeneration?: boolean
  clarifierRequired?: boolean
  clarifierPrompt?: string | null
  clarifierOptions?: string[]
  clarifierToken?: string | null
  crisis: CrisisRequirement
  options: AuditOptionPreview[]
  policy: {
    noAccountRequired: true
    maxAuditsPerCycle: number
    optionSplit: {
      aiPrimary: number
      curatedPrefab: number
      total: number
    }
  }
}

/**
 * Returned by /api/soul-audit/submit when clarifier-once is triggered.
 * The client shows the prompt + suggestions, then re-submits with
 * the user's clarifier response appended.
 */
export interface SoulAuditClarifierResponse {
  clarifierRequired: true
  clarifierPrompt: string
  clarifierOptions: string[]
  clarifierToken: string
}

export interface SoulAuditConsentRequest {
  auditRunId: string
  runToken?: string
  essentialAccepted: boolean
  analyticsOptIn?: boolean
  crisisAcknowledged?: boolean
}

export interface SoulAuditConsentResponse {
  ok: boolean
  auditRunId: string
  essentialAccepted: boolean
  analyticsOptIn: boolean
  crisisAcknowledged: boolean
  consentToken: string
}

export interface SoulAuditSelectRequest {
  auditRunId: string
  optionId: string
  runToken?: string
  consentToken?: string
  /** Inline consent — accepted as part of selection (no separate consent step). */
  essentialAccepted?: boolean
  analyticsOptIn?: boolean
  crisisAcknowledged?: boolean
  timezone?: string
  timezoneOffsetMinutes?: number
}

export type SoulAuditSelectionKind =
  | 'ai_primary'
  | 'ai_generative'
  | 'curated_prefab'

export type PlanStartPolicy =
  | 'monday_cycle'
  | 'tuesday_archived_monday'
  | 'wed_sun_onboarding'

export type PlanOnboardingVariant =
  | 'none'
  | 'wednesday_3_day'
  | 'thursday_2_day'
  | 'friday_1_day'
  | 'weekend_bridge'

export interface PlanOnboardingMeta {
  startPolicy: PlanStartPolicy
  onboardingVariant: PlanOnboardingVariant
  onboardingDays: number
  cycleStartAt: string
  timezone: string
  timezoneOffsetMinutes: number
}

export interface SoulAuditSelectResponse {
  ok: boolean
  auditRunId: string
  selectionType: SoulAuditSelectionKind
  route: string
  planToken?: string
  seriesSlug?: string
  planDays?: CustomPlanDay[]
  onboardingMeta?: PlanOnboardingMeta
  /** For generative plans: indicates if more days are still being generated. */
  generationStatus?: 'complete' | 'partial' | 'generating'
  /** Plan type for client-side routing decisions. */
  planType?: PlanType
}

export interface DevotionalDayEndnote {
  id: number
  source: string
  note: string
}

export type ChiasticPosition = 'A' | 'B' | 'C' | "B'" | "A'"

/** Extended chiastic positions for 7-day generative plans. */
export type ChiasticPosition7 = ChiasticPosition | 'Sabbath' | 'Review'

/** Day types in a 7-day generative plan. */
export type PlanDayType = 'devotional' | 'sabbath' | 'review' | 'onboarding'

/** Generation status for progressively-delivered plan days. */
export type DayGenerationStatus = 'ready' | 'pending' | 'generating' | 'failed'

/** Plan type distinguishes curated-matching from generative plans. */
export type PlanType = 'curated' | 'generative'

/**
 * DevotionalModule — one content block in a generated devotional.
 * The 12 types are a palette, not a checklist. Module selection is contextual.
 */
export type DevotionalModuleType =
  | 'scripture'
  | 'teaching'
  | 'vocab'
  | 'story'
  | 'insight'
  | 'bridge'
  | 'reflection'
  | 'comprehension'
  | 'takeaway'
  | 'prayer'
  | 'profile'
  | 'resource'

export interface DevotionalModule {
  type: DevotionalModuleType
  heading: string
  content: Record<string, unknown>
}

/**
 * Composition report — transparency for the 80/20 ratio.
 * Tracks how much content came from reference library vs LLM generation.
 */
export interface CompositionReport {
  referencePercentage: number
  generatedPercentage: number
  sources: string[]
}

/**
 * PlanOutline — a 7-day plan blueprint generated at submit time.
 * Stored with the option and used to drive day-by-day generation at select time.
 */
export interface PlanDayOutline {
  day: number
  dayType: PlanDayType
  chiasticPosition: ChiasticPosition7
  title: string
  scriptureReference: string
  topicFocus: string
  pardesLevel:
    | 'peshat'
    | 'remez'
    | 'derash'
    | 'sod'
    | 'integrated'
    | 'sabbath'
    | 'review'
  suggestedModules?: DevotionalModuleType[]
}

export interface PlanOutline {
  id: string
  angle: string
  title: string
  question: string
  reasoning: string
  scriptureAnchor: string
  dayOutlines: PlanDayOutline[]
  referenceSeeds: string[]
}

export interface PlanOutlinePreview {
  angle: string
  dayOutlines: Array<{
    day: number
    dayType: PlanDayType
    title: string
    scriptureReference: string
    topicFocus: string
  }>
}

/**
 * GenerationStatusResponse — poll endpoint for progressive delivery.
 */
export interface GenerationStatusResponse {
  planToken: string
  totalDays: number
  completedDays: number
  currentlyGenerating?: number
  status: 'complete' | 'generating' | 'partial_failure'
  days: Array<{
    day: number
    status: DayGenerationStatus
  }>
}

export interface CustomDevotional {
  title: string
  scriptureReference: string
  scriptureText: string
  reflection: string
  prayer: string
  nextStep: string
  journalPrompt: string
  generatedAt: string
}

export interface CustomPlanDay {
  day: number
  dayType?: PlanDayType
  title: string
  scriptureReference: string
  scriptureText: string
  reflection: string
  prayer: string
  nextStep: string
  journalPrompt: string
  chiasticPosition?: ChiasticPosition | ChiasticPosition7
  endnotes?: DevotionalDayEndnote[]
  /** Contextual module array (3-10 modules, not always 12). */
  modules?: DevotionalModule[]
  /** Actual word count of the generated content. */
  totalWords?: number
  /** User's slider setting (minutes) when this day was generated. */
  targetLengthMinutes?: number
  /** Progressive delivery status. */
  generationStatus?: DayGenerationStatus
  /** 80/20 composition transparency. */
  compositionReport?: CompositionReport
}

export interface CustomPlan {
  title: string
  summary: string
  generatedAt: string
  days: CustomPlanDay[]
}

export interface SoulAuditResponse {
  crisis: boolean
  message?: string
  resources?: Array<{ name: string; contact: string }>
  customPlan?: CustomPlan
  // Legacy compatibility for older payloads/UI branches
  customDevotional?: CustomDevotional
  matches?: AuditMatch[]
  // Legacy compatibility for older stored payloads
  match?: AuditMatch
  alternatives?: Array<{ slug: string; title: string; question: string }>
}
