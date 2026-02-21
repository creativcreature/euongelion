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

export type AuditOptionKind = 'ai_primary' | 'curated_prefab'

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

export type SoulAuditSelectionKind = 'ai_primary' | 'curated_prefab'

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
  title: string
  scriptureReference: string
  scriptureText: string
  reflection: string
  prayer: string
  nextStep: string
  journalPrompt: string
  chiasticPosition?: ChiasticPosition
  endnotes?: DevotionalDayEndnote[]
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
