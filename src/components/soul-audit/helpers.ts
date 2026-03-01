import { clampScriptureSnippet } from '@/lib/scripture-reference'
import type {
  CrisisResource,
  CustomPlanDay,
  PlanOnboardingMeta,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanDayResponse = {
  locked: boolean
  archived: boolean
  onboarding: boolean
  message?: string
  day?: CustomPlanDay | PlanDayPreview | null
  schedule?: PlanOnboardingMeta & {
    dayLocking?: 'enabled' | 'disabled'
  }
}

export type PlanDayPreview = Pick<
  CustomPlanDay,
  'day' | 'title' | 'scriptureReference' | 'scriptureText'
>

export type ArchivePlanSummary = {
  planToken: string
  createdAt: string
  route: string
  seriesSlug: string
  days: Array<{
    day: number
    title: string
    route: string
  }>
}

export type SavedAuditOption = {
  id: string
  auditRunId: string
  kind: 'ai_primary' | 'ai_generative' | 'curated_prefab'
  title: string
  question: string
  reasoning: string
  verse?: string
  verseText?: string
  paragraph?: string
  savedAt: string
}

export type RailDay = {
  day: number
  title: string
  scriptureReference?: string
  locked: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLAN_CACHE_PREFIX = 'soul-audit-plan-v2:'
export const SAVED_OPTIONS_KEY = 'soul-audit-saved-options-v1'
export const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'
export const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'

// ---------------------------------------------------------------------------
// Legacy text sanitization
// ---------------------------------------------------------------------------

const LEGACY_BURDEN_FRAMING_PATTERN =
  /\b(you named this burden|because you named)\b/i
const LEGACY_FRAGMENT_TITLE_PATTERN = /^want learn\b/i

function containsLegacyAuditLanguage(
  value: string | null | undefined,
): boolean {
  if (!value) return false
  return (
    LEGACY_BURDEN_FRAMING_PATTERN.test(value) ||
    LEGACY_FRAGMENT_TITLE_PATTERN.test(value.trim())
  )
}

export function hasLegacyAuditOptionCopy(
  result: SoulAuditSubmitResponseV2,
): boolean {
  return result.options.some((option) => {
    return (
      containsLegacyAuditLanguage(option.title) ||
      containsLegacyAuditLanguage(option.question) ||
      containsLegacyAuditLanguage(option.reasoning) ||
      containsLegacyAuditLanguage(option.preview?.paragraph)
    )
  })
}

export function sanitizeLegacyDisplayText(value: string): string {
  return value
    .replace(
      /you named this burden:\s*[""\u201C]?([^""\u201D]+)[""\u201D]?\s*/gi,
      'You shared this reflection: "$1". ',
    )
    .replace(
      /because you named\s*[""\u201C]?([^""\u201D]+)[""\u201D]?\s*/gi,
      'Because you shared this reflection, ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function formatCycleStart(value: string, timezone?: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || undefined,
  })
}

export function onboardingLabel(
  meta: PlanOnboardingMeta | null,
): string | null {
  if (!meta || meta.startPolicy !== 'wed_sun_onboarding') return null
  if (meta.onboardingVariant === 'wednesday_3_day')
    return 'WEDNESDAY 3-DAY PRIMER'
  if (meta.onboardingVariant === 'thursday_2_day')
    return 'THURSDAY 2-DAY PRIMER'
  if (meta.onboardingVariant === 'friday_1_day') return 'FRIDAY 1-DAY PRIMER'
  return 'WEEKEND BRIDGE PRIMER'
}

export function onboardingDescription(
  meta: PlanOnboardingMeta | null,
): string | null {
  if (!meta || meta.startPolicy !== 'wed_sun_onboarding') return null
  if (meta.onboardingVariant === 'wednesday_3_day') {
    return 'You started on Wednesday. Use this 3-day primer to build rhythm before the full Monday cycle.'
  }
  if (meta.onboardingVariant === 'thursday_2_day') {
    return 'You started on Thursday. Use this 2-day primer to settle your pace before Monday.'
  }
  if (meta.onboardingVariant === 'friday_1_day') {
    return 'You started on Friday. This focused primer prepares your next step before Monday.'
  }
  return 'You started on the weekend. This bridge day keeps momentum until Monday.'
}

// ---------------------------------------------------------------------------
// Module / day helpers
// ---------------------------------------------------------------------------

export function extractModuleText(content: Record<string, unknown>): string {
  if (typeof content.text === 'string') return content.text
  if (typeof content.prompt === 'string') return content.prompt
  if (typeof content.passage === 'string') return content.passage
  if (typeof content.body === 'string') return content.body
  const parts = Object.values(content).filter(
    (v): v is string => typeof v === 'string',
  )
  return parts.join('\n\n')
}

export function isFullPlanDay(value: unknown): value is CustomPlanDay {
  if (!value || typeof value !== 'object') return false
  const day = value as Partial<CustomPlanDay>
  return (
    typeof day.day === 'number' &&
    typeof day.title === 'string' &&
    typeof day.scriptureReference === 'string' &&
    typeof day.reflection === 'string' &&
    typeof day.prayer === 'string' &&
    typeof day.nextStep === 'string' &&
    typeof day.journalPrompt === 'string'
  )
}

export function isPlanPreview(value: unknown): value is PlanDayPreview {
  if (!value || typeof value !== 'object') return false
  const day = value as Partial<PlanDayPreview>
  return (
    typeof day.day === 'number' &&
    typeof day.title === 'string' &&
    typeof day.scriptureReference === 'string'
  )
}

// ---------------------------------------------------------------------------
// Session / local storage helpers
// ---------------------------------------------------------------------------

export function loadSubmitResult(): SoulAuditSubmitResponseV2 | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('soul-audit-submit-v2')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SoulAuditSubmitResponseV2
    if (parsed.version !== 'v2') return null
    if (hasLegacyAuditOptionCopy(parsed)) {
      sessionStorage.removeItem('soul-audit-submit-v2')
      sessionStorage.removeItem('soul-audit-selection-v2')
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function loadSelectionResult():
  | import('@/types/soul-audit').SoulAuditSelectResponse
  | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('soul-audit-selection-v2')
  if (!raw) return null
  try {
    const parsed = JSON.parse(
      raw,
    ) as import('@/types/soul-audit').SoulAuditSelectResponse
    return parsed.ok ? parsed : null
  } catch {
    return null
  }
}

export function persistPlanDays(token: string, days: CustomPlanDay[]): void {
  if (typeof window === 'undefined' || !token || days.length === 0) return
  localStorage.setItem(`${PLAN_CACHE_PREFIX}${token}`, JSON.stringify(days))
}

export function loadPlanDays(token: string): CustomPlanDay[] {
  if (typeof window === 'undefined' || !token) return []
  const raw = localStorage.getItem(`${PLAN_CACHE_PREFIX}${token}`)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown[]
    return Array.isArray(parsed) ? parsed.filter(isFullPlanDay) : []
  } catch {
    return []
  }
}

export function loadSavedAuditOptions(): SavedAuditOption[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(SAVED_OPTIONS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SavedAuditOption[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry) =>
          typeof entry.id === 'string' &&
          typeof entry.auditRunId === 'string' &&
          typeof entry.title === 'string' &&
          typeof entry.question === 'string' &&
          typeof entry.savedAt === 'string',
      )
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  } catch {
    return []
  }
}

export function persistSavedAuditOptions(options: SavedAuditOption[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVED_OPTIONS_KEY, JSON.stringify(options))
}

export function loadLastAuditInput(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(LAST_AUDIT_INPUT_SESSION_KEY)
  if (!raw) return null
  const normalized = raw.trim()
  return normalized.length > 0 ? normalized : null
}

export function resolveVerseSnippet(
  verseText?: string | null,
  paragraph?: string | null,
): string {
  if (typeof verseText === 'string' && verseText.trim().length > 0) {
    return clampScriptureSnippet(verseText)
  }
  if (typeof paragraph === 'string' && paragraph.trim().length > 0) {
    return clampScriptureSnippet(paragraph)
  }
  return ''
}

export function crisisResourceHref(resource: CrisisResource): string | null {
  const normalized = resource.contact.toLowerCase()
  if (normalized.includes('741741')) return 'sms:741741?body=HOME'
  if (normalized.includes('988')) return 'tel:988'
  return null
}
