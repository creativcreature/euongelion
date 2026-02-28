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
}

export interface DevotionalDayEndnote {
  id: number
  source: string
  note: string
}

export type ChiasticPosition = 'A' | 'B' | 'C' | "B'" | "A'"

/** Extended chiastic positions for 7-day plans. */
export type ChiasticPosition7 = ChiasticPosition | 'Sabbath' | 'Review'

/** Day types in a devotional plan. */
export type PlanDayType = 'devotional' | 'sabbath' | 'review' | 'onboarding'

/**
 * DevotionalModule — one content block in a devotional day.
 * Module selection is contextual: not every day uses every type.
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
  /** Contextual module array (3-10 modules per day). */
  modules?: DevotionalModule[]
  /** Actual word count of the content. */
  totalWords?: number
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
  customDevotional?: {
    title: string
    scriptureReference: string
    scriptureText: string
    reflection: string
    prayer: string
    nextStep: string
    journalPrompt: string
    generatedAt: string
  }
  matches?: AuditMatch[]
  match?: AuditMatch
  alternatives?: Array<{ slug: string; title: string; question: string }>
}
