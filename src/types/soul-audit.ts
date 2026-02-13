export interface AuditMatch {
  slug: string
  title: string
  question: string
  confidence: number
  reasoning: string
  preview?: { verse: string; paragraph: string } | null
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
  remainingAudits: number
  requiresEssentialConsent: true
  analyticsOptInDefault: false
  consentAccepted: boolean
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
}

export interface SoulAuditSelectRequest {
  auditRunId: string
  optionId: string
  timezone?: string
  timezoneOffsetMinutes?: number
}

export type SoulAuditSelectionKind = 'ai_primary' | 'curated_prefab'

export interface SoulAuditSelectResponse {
  ok: boolean
  auditRunId: string
  selectionType: SoulAuditSelectionKind
  route: string
  planToken?: string
  seriesSlug?: string
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
