export interface AuditMatch {
  slug: string
  title: string
  question: string
  confidence: number
  reasoning: string
  preview?: { verse: string; paragraph: string } | null
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
