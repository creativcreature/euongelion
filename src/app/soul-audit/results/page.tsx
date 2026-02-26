'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import DevotionalStickiesLayer from '@/components/DevotionalStickiesLayer'
import ScrollProgress from '@/components/ScrollProgress'
import ReaderTimeline, {
  type ReaderSectionAnchor,
} from '@/components/ReaderTimeline'
import FadeIn from '@/components/motion/FadeIn'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import {
  SITE_CONSENT_UPDATED_EVENT,
  readSiteConsentFromDocument,
  type SiteConsent,
} from '@/lib/site-consent'
import { clampScriptureSnippet } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import type {
  CrisisResource,
  CustomPlanDay,
  GenerationStatusResponse,
  PlanOnboardingMeta,
  SoulAuditConsentResponse,
  SoulAuditSelectResponse,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

type PlanDayResponse = {
  locked: boolean
  archived: boolean
  onboarding: boolean
  message?: string
  day?: CustomPlanDay | PlanDayPreview | null
  schedule?: PlanOnboardingMeta & {
    dayLocking?: 'enabled' | 'disabled'
  }
}

type PlanDayPreview = Pick<
  CustomPlanDay,
  'day' | 'title' | 'scriptureReference' | 'scriptureText'
>

type ArchivePlanSummary = {
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

const PLAN_CACHE_PREFIX = 'soul-audit-plan-v2:'
const SAVED_OPTIONS_KEY = 'soul-audit-saved-options-v1'
const LAST_AUDIT_INPUT_SESSION_KEY = 'soul-audit-last-input'
const REROLL_USED_SESSION_KEY = 'soul-audit-reroll-used'
const GUEST_SIGNUP_GATE_KEY = 'soul-audit-guest-signup-gate-v1'

// Cascade generation constants
const CASCADE_MAX_RETRIES = 2
const CASCADE_RETRY_DELAY_MS = 2000
const CASCADE_REQUEST_TIMEOUT_MS = 60_000
const CASCADE_MAX_ALREADY_GENERATING = 12
const CASCADE_MAX_CONSECUTIVE_FAILURES = 4
const CASCADE_STATUS_CHECK_TIMEOUT_MS = 10_000

/** Response shape from POST /api/soul-audit/generate-next */
interface GenerateNextPayload {
  generatedDay?: CustomPlanDay
  nextPendingDay?: number | null
  status?: 'complete' | 'partial' | 'already_generating'
  totalDays?: number
  completedDays?: number
}
const LEGACY_BURDEN_FRAMING_PATTERN =
  /\b(you named this burden|because you named)\b/i
const LEGACY_FRAGMENT_TITLE_PATTERN = /^want learn\b/i

type SavedAuditOption = {
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

type AuthSessionSnapshot = {
  authenticated: boolean
  user: { id: string; email: string | null } | null
}

type GuestOnboardingTheme = 'dark' | 'light' | 'system'
type GuestOnboardingTextScale = 'default' | 'large' | 'xlarge'

function containsLegacyAuditLanguage(
  value: string | null | undefined,
): boolean {
  if (!value) return false
  return (
    LEGACY_BURDEN_FRAMING_PATTERN.test(value) ||
    LEGACY_FRAGMENT_TITLE_PATTERN.test(value.trim())
  )
}

function hasLegacyAuditOptionCopy(result: SoulAuditSubmitResponseV2): boolean {
  return result.options.some((option) => {
    return (
      containsLegacyAuditLanguage(option.title) ||
      containsLegacyAuditLanguage(option.question) ||
      containsLegacyAuditLanguage(option.reasoning) ||
      containsLegacyAuditLanguage(option.preview?.paragraph)
    )
  })
}

function sanitizeLegacyDisplayText(value: string): string {
  return value
    .replace(
      /you named this burden:\s*["“]?([^"”]+)["”]?\s*/gi,
      'You shared this reflection: "$1". ',
    )
    .replace(
      /because you named\s*["“]?([^"”]+)["”]?\s*/gi,
      'Because you shared this reflection, ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function formatCycleStart(value: string, timezone?: string): string {
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

function onboardingLabel(meta: PlanOnboardingMeta | null): string | null {
  if (!meta || meta.startPolicy !== 'wed_sun_onboarding') return null
  if (meta.onboardingVariant === 'wednesday_3_day')
    return 'WEDNESDAY 3-DAY PRIMER'
  if (meta.onboardingVariant === 'thursday_2_day')
    return 'THURSDAY 2-DAY PRIMER'
  if (meta.onboardingVariant === 'friday_1_day') return 'FRIDAY 1-DAY PRIMER'
  return 'WEEKEND BRIDGE PRIMER'
}

function onboardingDescription(meta: PlanOnboardingMeta | null): string | null {
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

function extractModuleText(content: Record<string, unknown>): string {
  // Module content may be { text: "..." } or { prompt: "..." } or nested
  if (typeof content.text === 'string') return content.text
  if (typeof content.prompt === 'string') return content.prompt
  if (typeof content.passage === 'string') return content.passage
  if (typeof content.body === 'string') return content.body
  // Fallback: join all string values
  const parts = Object.values(content).filter(
    (v): v is string => typeof v === 'string',
  )
  return parts.join('\n\n')
}

function isFullPlanDay(value: unknown): value is CustomPlanDay {
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

function isPlanPreview(value: unknown): value is PlanDayPreview {
  if (!value || typeof value !== 'object') return false
  const day = value as Partial<PlanDayPreview>
  return (
    typeof day.day === 'number' &&
    typeof day.title === 'string' &&
    typeof day.scriptureReference === 'string'
  )
}

function loadSubmitResult(): SoulAuditSubmitResponseV2 | null {
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

function loadSelectionResult(): SoulAuditSelectResponse | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('soul-audit-selection-v2')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SoulAuditSelectResponse
    return parsed.ok ? parsed : null
  } catch {
    return null
  }
}

function persistPlanDays(token: string, days: CustomPlanDay[]): void {
  if (typeof window === 'undefined' || !token || days.length === 0) return
  localStorage.setItem(`${PLAN_CACHE_PREFIX}${token}`, JSON.stringify(days))
}

function loadPlanDays(token: string): CustomPlanDay[] {
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

function loadSavedAuditOptions(): SavedAuditOption[] {
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

function loadLastAuditInput(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(LAST_AUDIT_INPUT_SESSION_KEY)
  if (!raw) return null
  const normalized = raw.trim()
  return normalized.length > 0 ? normalized : null
}

function persistSavedAuditOptions(options: SavedAuditOption[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVED_OPTIONS_KEY, JSON.stringify(options))
}

function resolveVerseSnippet(
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

function crisisResourceHref(resource: CrisisResource): string | null {
  const normalized = resource.contact.toLowerCase()
  if (normalized.includes('741741')) {
    return 'sms:741741?body=HOME'
  }
  if (normalized.includes('988')) {
    return 'tel:988'
  }
  return null
}

export default function SoulAuditResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSelection = loadSelectionResult()
  const { lastInput, auditCount } = useSoulAuditStore()
  const currentSabbathDay = useSettingsStore((state) => state.sabbathDay)
  const currentTextScale = useSettingsStore((state) => state.textScale)
  const setSabbathDay = useSettingsStore((state) => state.setSabbathDay)
  const setTextScale = useSettingsStore((state) => state.setTextScale)
  const currentTheme = useUIStore((state) => state.theme)
  const setTheme = useUIStore((state) => state.setTheme)

  const [submitResult, setSubmitResult] =
    useState<SoulAuditSubmitResponseV2 | null>(() => loadSubmitResult())
  const [selection, setSelection] = useState<SoulAuditSelectResponse | null>(
    () => initialSelection,
  )
  const [siteConsent, setSiteConsent] = useState<SiteConsent | null>(null)
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectionInlineError, setSelectionInlineError] = useState<
    string | null
  >(null)
  const [runExpired, setRunExpired] = useState(false)
  const [planDays, setPlanDays] = useState<CustomPlanDay[]>(() =>
    Array.isArray(initialSelection?.planDays)
      ? initialSelection.planDays.filter(isFullPlanDay)
      : [],
  )
  const [lockedDayPreviews, setLockedDayPreviews] = useState<PlanDayPreview[]>(
    [],
  )
  const [lockedMessages, setLockedMessages] = useState<string[]>([])
  const [archivePlans, setArchivePlans] = useState<ArchivePlanSummary[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [planOnboardingMeta, setPlanOnboardingMeta] =
    useState<PlanOnboardingMeta | null>(
      initialSelection?.onboardingMeta ?? null,
    )
  const [bookmarkingDay, setBookmarkingDay] = useState<number | null>(null)
  const [savedDay, setSavedDay] = useState<number | null>(null)
  const [expandedReasoningOptionId, setExpandedReasoningOptionId] = useState<
    string | null
  >(null)
  const [rerollUsed, setRerollUsed] = useState(false)
  const [isRerolling, setIsRerolling] = useState(false)
  const [savedOptions, setSavedOptions] = useState<SavedAuditOption[]>([])
  const [savedOptionsMessage, setSavedOptionsMessage] = useState<string | null>(
    null,
  )
  const [lastAuditInput, setLastAuditInput] = useState<string | null>(() =>
    loadLastAuditInput(),
  )
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  )
  const [authState, setAuthState] = useState<AuthSessionSnapshot>({
    authenticated: false,
    user: null,
  })
  const [authStateLoaded, setAuthStateLoaded] = useState(false)
  const [guestGateOpen, setGuestGateOpen] = useState(false)
  const [guestGateStep, setGuestGateStep] = useState<'signup' | 'onboarding'>(
    'signup',
  )
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)
  const [guestSabbathDay, setGuestSabbathDay] = useState<'saturday' | 'sunday'>(
    'sunday',
  )
  const [guestTheme, setGuestTheme] = useState<GuestOnboardingTheme>('dark')
  const [guestTextScale, setGuestTextScale] =
    useState<GuestOnboardingTextScale>('default')
  const [isGenerativePlan, setIsGenerativePlan] = useState(
    () => initialSelection?.planType === 'generative',
  )
  const [generationProgress, setGenerationProgress] =
    useState<GenerationStatusResponse | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setRerollUsed(
      window.sessionStorage.getItem(REROLL_USED_SESSION_KEY) === 'true',
    )
    setSavedOptions(loadSavedAuditOptions())
  }, [])

  useEffect(() => {
    setGuestSabbathDay(currentSabbathDay)
  }, [currentSabbathDay])

  useEffect(() => {
    setGuestTextScale(currentTextScale)
  }, [currentTextScale])

  useEffect(() => {
    setGuestTheme(currentTheme)
  }, [currentTheme])

  useEffect(() => {
    let cancelled = false

    async function loadAuthState() {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const payload = (await response.json()) as AuthSessionSnapshot
        if (cancelled) return
        setAuthState({
          authenticated: Boolean(payload?.authenticated),
          user: payload?.user ?? null,
        })
      } catch {
        if (cancelled) return
        setAuthState({ authenticated: false, user: null })
      } finally {
        if (!cancelled) {
          setAuthStateLoaded(true)
        }
      }
    }

    void loadAuthState()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setSiteConsent(readSiteConsentFromDocument())
    const onConsentUpdated = () => sync()

    sync()
    window.addEventListener(SITE_CONSENT_UPDATED_EVENT, onConsentUpdated)
    return () => {
      window.removeEventListener(SITE_CONSENT_UPDATED_EVENT, onConsentUpdated)
    }
  }, [])

  useEffect(() => {
    if (!lastInput) return
    setLastAuditInput(lastInput)
    window.sessionStorage.setItem(LAST_AUDIT_INPUT_SESSION_KEY, lastInput)
  }, [lastInput])

  useEffect(() => {
    const fromStorage = loadSubmitResult()
    if (!fromStorage) return
    setSubmitResult(fromStorage)
  }, [])

  useEffect(() => {
    const fromStorage = loadSelectionResult()
    if (!fromStorage) return
    setSelection(fromStorage)
    if (fromStorage.planType === 'generative') {
      setIsGenerativePlan(true)
    }
    if (fromStorage.onboardingMeta) {
      setPlanOnboardingMeta(fromStorage.onboardingMeta)
    }
    if (Array.isArray(fromStorage.planDays)) {
      const safeDays = fromStorage.planDays.filter(isFullPlanDay)
      if (safeDays.length > 0) {
        setPlanDays(safeDays)
      }
    }
  }, [])

  const planToken = useMemo(() => {
    return searchParams.get('planToken') || selection?.planToken || null
  }, [searchParams, selection?.planToken])
  const requestedDayNumber = useMemo(() => {
    const raw = searchParams.get('day')
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  }, [searchParams])
  const crisisRequirementsMet = Boolean(
    !submitResult?.crisis.required || crisisAcknowledged,
  )
  const optionSelectionReady = Boolean(!submitting && crisisRequirementsMet)
  const rerollsRemaining = rerollUsed ? 0 : 1

  const loadGenerativePlanStatus = useCallback(
    async (
      token: string,
      signal?: AbortSignal,
    ): Promise<GenerationStatusResponse | null> => {
      try {
        const response = await fetch(
          `/api/soul-audit/generation-status?planToken=${encodeURIComponent(token)}`,
          signal ? { signal } : undefined,
        )
        if (!response.ok) return null
        return (await response.json()) as GenerationStatusResponse
      } catch {
        return null
      }
    },
    [],
  )

  const loadPlan = useCallback(async (token: string) => {
    setLoadingPlan(true)
    setError(null)

    try {
      const cachedPlanDays = loadPlanDays(token)
      const requests = [1, 2, 3, 4, 5].map(async (day) => {
        const response = await fetch(
          `/api/devotional-plan/${token}/day/${day}?preview=1`,
        )
        const payload = (await response.json()) as PlanDayResponse
        return { day, status: response.status, payload }
      })

      const responses = await Promise.all(requests)
      const unlockedDays: CustomPlanDay[] = []
      const lockedPreviews: PlanDayPreview[] = []
      const locks: string[] = []
      let resolvedSchedule: PlanOnboardingMeta | null = null

      for (const entry of responses) {
        if (!resolvedSchedule && entry.payload.schedule) {
          resolvedSchedule = entry.payload.schedule
        }
        if (entry.status === 200 && entry.payload.day) {
          if (entry.payload.locked && isPlanPreview(entry.payload.day)) {
            lockedPreviews.push(entry.payload.day)
          } else if (
            !entry.payload.locked &&
            isFullPlanDay(entry.payload.day)
          ) {
            unlockedDays.push(entry.payload.day)
          }
        }
        if (entry.status === 423 && entry.payload.message) {
          locks.push(entry.payload.message)
        }
        if (
          entry.status === 200 &&
          entry.payload.locked &&
          entry.payload.message
        ) {
          locks.push(entry.payload.message)
        }
      }

      // Wed-Sun onboarding mode: day 0 exists before Monday cycle unlocks.
      if (unlockedDays.length === 0) {
        const onboardingResponse = await fetch(
          `/api/devotional-plan/${token}/day/0`,
        )
        if (onboardingResponse.status === 200) {
          const onboardingPayload =
            (await onboardingResponse.json()) as PlanDayResponse
          if (!resolvedSchedule && onboardingPayload.schedule) {
            resolvedSchedule = onboardingPayload.schedule
          }
          if (isFullPlanDay(onboardingPayload.day)) {
            unlockedDays.push(onboardingPayload.day)
          }
        }
      }

      unlockedDays.sort((a, b) => a.day - b.day)
      lockedPreviews.sort((a, b) => a.day - b.day)
      const resolvedPlanDays =
        unlockedDays.length > 0 ? unlockedDays : cachedPlanDays
      setPlanDays(resolvedPlanDays)
      setLockedDayPreviews(lockedPreviews)
      setLockedMessages(Array.from(new Set(locks)))
      if (resolvedSchedule) {
        setPlanOnboardingMeta(resolvedSchedule)
      }
      if (resolvedPlanDays.length > 0) {
        persistPlanDays(token, resolvedPlanDays)
      }
    } catch (err) {
      const cachedPlanDays = loadPlanDays(token)
      if (cachedPlanDays.length > 0) {
        setPlanDays(cachedPlanDays)
        setLockedDayPreviews([])
        setLockedMessages([])
      } else {
        setError(err instanceof Error ? err.message : 'Unable to load plan.')
      }
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    if (!planToken) return
    const cachedPlanDays = loadPlanDays(planToken)
    if (cachedPlanDays.length > 0) {
      setPlanDays(cachedPlanDays)
    }
    if (isGenerativePlan) {
      // For generative plans, load status instead of day-by-day API
      void loadGenerativePlanStatus(planToken).then((status) => {
        if (status) setGenerationProgress(status)
      })
    } else {
      void loadPlan(planToken)
    }
  }, [isGenerativePlan, loadGenerativePlanStatus, loadPlan, planToken])

  // Ref-stable cascade generation for generative plans: generates Days 2-7.
  // Uses ref for cancellation so React effect cleanup on re-renders doesn't
  // kill the generation loop. Includes retry + skip on persistent failure.
  const cascadeStartedRef = useRef(false)
  const cascadeCancelledRef = useRef(false)

  useEffect(() => {
    if (!planToken || !isGenerativePlan) return
    if (selection?.generationStatus === 'complete') return
    if (cascadeStartedRef.current) return

    cascadeStartedRef.current = true
    cascadeCancelledRef.current = false
    const token = planToken
    // Effect-level controller: aborted on cleanup to cancel all in-flight
    // fetches when the component unmounts or deps change.
    const effectController = new AbortController()
    const effectSignal = effectController.signal

    async function generateOneDay(): Promise<{
      generatedDay?: CustomPlanDay
      nextPendingDay?: number | null
      status?: string
      done: boolean
    }> {
      // Per-request controller for the 60s timeout. Separate from the
      // effect-level controller so a single timeout doesn't kill the
      // entire cascade. Effect cleanup aborts the effect controller which
      // the cascadeCancelledRef check handles.
      const reqController = new AbortController()
      const timeoutId = setTimeout(
        () => reqController.abort(),
        CASCADE_REQUEST_TIMEOUT_MS,
      )
      // If the effect is cleaned up, also abort this request.
      const onEffectAbort = () => reqController.abort()
      effectSignal.addEventListener('abort', onEffectAbort, { once: true })

      try {
        const genRes = await fetch('/api/soul-audit/generate-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planToken: token }),
          signal: reqController.signal,
        })
        clearTimeout(timeoutId)
        effectSignal.removeEventListener('abort', onEffectAbort)

        if (!genRes.ok) {
          return { done: false }
        }

        const payload = (await genRes.json()) as GenerateNextPayload

        if (payload.status === 'complete' || payload.status === 'already_generating') {
          return { ...payload, done: payload.status === 'complete' }
        }

        return { ...payload, done: payload.nextPendingDay === null }
      } catch {
        clearTimeout(timeoutId)
        effectSignal.removeEventListener('abort', onEffectAbort)
        if (effectSignal.aborted) return { done: true }
        // After timeout, the server-side request may still complete.
        // Check status with its own timeout to avoid unbounded hang.
        try {
          const statusController = new AbortController()
          const statusTimeout = setTimeout(
            () => statusController.abort(),
            CASCADE_STATUS_CHECK_TIMEOUT_MS,
          )
          const onAbort = () => statusController.abort()
          effectSignal.addEventListener('abort', onAbort, { once: true })
          try {
            const status = await loadGenerativePlanStatus(
              token,
              statusController.signal,
            )
            if (status?.status === 'complete') return { done: true }
          } finally {
            clearTimeout(statusTimeout)
            effectSignal.removeEventListener('abort', onAbort)
          }
        } catch {
          // Status check failed too — treat as generic failure
        }
        return { done: false }
      }
    }

    async function cascadeGeneration() {
      // Initial status check
      const initialStatus = await loadGenerativePlanStatus(token, effectSignal)
      if (cascadeCancelledRef.current || !initialStatus) return
      setGenerationProgress(initialStatus)
      if (
        initialStatus.status === 'complete' ||
        initialStatus.status === 'partial_failure'
      ) {
        return
      }

      let consecutiveFailures = 0
      let alreadyGeneratingCount = 0

      while (!cascadeCancelledRef.current) {
        let succeeded = false

        for (let attempt = 0; attempt <= CASCADE_MAX_RETRIES; attempt++) {
          if (cascadeCancelledRef.current) return

          const result = await generateOneDay()
          if (cascadeCancelledRef.current) return

          if (result.generatedDay && isFullPlanDay(result.generatedDay)) {
            const newDay = result.generatedDay
            setPlanDays((prev) => {
              const existing = prev.filter((d) => d.day !== newDay.day)
              return [...existing, newDay].sort(
                (a, b) => a.day - b.day,
              )
            })
            // Persist outside the state updater — updater functions must be pure.
            // We rebuild the merged array here since we can't read state synchronously.
            const cached = loadPlanDays(token)
            const merged = [
              ...cached.filter((d) => d.day !== newDay.day),
              newDay,
            ].sort((a, b) => a.day - b.day)
            persistPlanDays(token, merged)
            succeeded = true
            consecutiveFailures = 0
            // Note: alreadyGeneratingCount is NOT reset on success — it tracks
            // total "stuck lock" signals across the entire cascade to prevent
            // unbounded polling if the lock repeatedly cycles.
          }

          if (result.done) {
            // All days generated
            const finalStatus = await loadGenerativePlanStatus(token, effectSignal)
            if (finalStatus) setGenerationProgress(finalStatus)
            return
          }

          if (result.status === 'already_generating') {
            alreadyGeneratingCount++
            if (alreadyGeneratingCount >= CASCADE_MAX_ALREADY_GENERATING) {
              // Server lock appears stuck — stop polling
              break
            }
            // Another request is handling it — wait and poll again
            await new Promise((r) => setTimeout(r, CASCADE_RETRY_DELAY_MS))
            consecutiveFailures = 0
            succeeded = true
            break
          }

          if (succeeded) break

          // Failed — retry with backoff
          if (attempt < CASCADE_MAX_RETRIES) {
            await new Promise((r) =>
              setTimeout(r, CASCADE_RETRY_DELAY_MS * (attempt + 1)),
            )
          }
        }

        if (alreadyGeneratingCount >= CASCADE_MAX_ALREADY_GENERATING) break

        if (!succeeded) {
          consecutiveFailures++
          if (consecutiveFailures >= CASCADE_MAX_CONSECUTIVE_FAILURES) {
            // Too many failures in a row — stop but don't crash
            break
          }
          // Wait before next attempt
          await new Promise((r) => setTimeout(r, CASCADE_RETRY_DELAY_MS))
        }

        // Update progress
        const status = await loadGenerativePlanStatus(token, effectSignal)
        if (cascadeCancelledRef.current) return
        if (status) {
          setGenerationProgress(status)
          if (
            status.status === 'complete' ||
            status.status === 'partial_failure'
          ) {
            return
          }
        }
      }

      // Cascade stopped due to failure circuit-breakers — surface to user.
      if (!cascadeCancelledRef.current) {
        const finalStatus = await loadGenerativePlanStatus(token, effectSignal)
        if (finalStatus) setGenerationProgress(finalStatus)
        if (
          !finalStatus ||
          (finalStatus.status !== 'complete' &&
            finalStatus.status !== 'partial_failure')
        ) {
          setError(
            'Some devotional days could not be generated. You can read the days that are ready.',
          )
        }
      }
    }

    void cascadeGeneration()
    return () => {
      cascadeCancelledRef.current = true
      cascadeStartedRef.current = false
      effectController.abort()
    }
  }, [isGenerativePlan, loadGenerativePlanStatus, planToken, selection?.generationStatus])

  useEffect(() => {
    if (!planToken) return
    let cancelled = false

    async function loadArchive() {
      try {
        const response = await fetch('/api/soul-audit/archive', {
          cache: 'no-store',
        })
        if (!response.ok) return
        const payload = (await response.json()) as {
          archive?: ArchivePlanSummary[]
        }
        if (!cancelled && Array.isArray(payload.archive)) {
          setArchivePlans(payload.archive)
        }
      } catch {
        // no-op
      }
    }

    void loadArchive()
    return () => {
      cancelled = true
    }
  }, [planToken])

  const railDays = useMemo(() => {
    const byDay = new Map<
      number,
      {
        day: number
        title: string
        scriptureReference?: string
        locked: boolean
        generationStatus?: 'ready' | 'pending' | 'generating' | 'failed'
      }
    >()

    for (const day of planDays) {
      byDay.set(day.day, {
        day: day.day,
        title: day.title,
        scriptureReference: day.scriptureReference,
        locked: false,
        generationStatus: day.generationStatus ?? 'ready',
      })
    }

    for (const day of lockedDayPreviews) {
      if (byDay.has(day.day)) continue
      byDay.set(day.day, {
        day: day.day,
        title: day.title,
        scriptureReference: day.scriptureReference,
        locked: true,
      })
    }

    // For generative plans, include pending days from generation progress
    if (isGenerativePlan && generationProgress) {
      for (const dayStatus of generationProgress.days) {
        if (byDay.has(dayStatus.day)) {
          const existing = byDay.get(dayStatus.day)!
          existing.generationStatus = dayStatus.status as
            | 'ready'
            | 'pending'
            | 'generating'
            | 'failed'
        } else {
          byDay.set(dayStatus.day, {
            day: dayStatus.day,
            title: `Day ${dayStatus.day}`,
            locked: false,
            generationStatus: dayStatus.status as
              | 'ready'
              | 'pending'
              | 'generating'
              | 'failed',
          })
        }
      }
    }

    return Array.from(byDay.values()).sort((a, b) => a.day - b.day)
  }, [generationProgress, isGenerativePlan, lockedDayPreviews, planDays])

  const currentDayNumber = useMemo(() => {
    if (planDays.length === 0) return null
    return Math.max(...planDays.map((day) => day.day))
  }, [planDays])
  const selectedRailDay = useMemo(
    () => railDays.find((day) => day.day === selectedDayNumber) ?? null,
    [railDays, selectedDayNumber],
  )
  const selectedPlanDay = useMemo(
    () => planDays.find((day) => day.day === selectedDayNumber) ?? null,
    [planDays, selectedDayNumber],
  )
  const selectedPlanDaySlug =
    planToken && selectedPlanDay
      ? `plan-${planToken}-day-${selectedPlanDay.day}`
      : null
  const daySectionAnchors = useMemo<ReaderSectionAnchor[]>(() => {
    if (!selectedPlanDay) return []
    // For generative plans with modules, build anchors from module types
    if (selectedPlanDay.modules && selectedPlanDay.modules.length > 0) {
      const anchors: ReaderSectionAnchor[] = []
      const seen = new Set<string>()
      for (const mod of selectedPlanDay.modules) {
        if (
          ['scripture', 'reflection', 'prayer'].includes(mod.type) &&
          !seen.has(mod.type)
        ) {
          seen.add(mod.type)
          anchors.push({
            id: `day-${selectedPlanDay.day}-${mod.type}`,
            label: mod.type.toUpperCase(),
          })
        }
      }
      if (selectedPlanDay.nextStep) {
        anchors.push({
          id: `day-${selectedPlanDay.day}-practice`,
          label: 'NEXT STEP',
        })
      }
      return anchors
    }
    return [
      { id: `day-${selectedPlanDay.day}-scripture`, label: 'SCRIPTURE' },
      { id: `day-${selectedPlanDay.day}-reflection`, label: 'REFLECTION' },
      { id: `day-${selectedPlanDay.day}-prayer`, label: 'PRAYER' },
      { id: `day-${selectedPlanDay.day}-practice`, label: 'NEXT STEP' },
      { id: `day-${selectedPlanDay.day}-journal`, label: 'JOURNAL' },
    ]
  }, [selectedPlanDay])

  const archiveForRail = useMemo(
    () => archivePlans.filter((plan) => plan.planToken !== planToken),
    [archivePlans, planToken],
  )

  useEffect(() => {
    if (requestedDayNumber === null) return
    setSelectedDayNumber((current) =>
      current === requestedDayNumber ? current : requestedDayNumber,
    )
  }, [requestedDayNumber])

  useEffect(() => {
    if (railDays.length === 0) return
    const hasSelected =
      selectedDayNumber !== null &&
      railDays.some((entry) => entry.day === selectedDayNumber)
    if (hasSelected) return

    const fallbackDay = currentDayNumber ?? railDays[0].day
    setSelectedDayNumber(fallbackDay)
  }, [currentDayNumber, railDays, selectedDayNumber])

  useEffect(() => {
    if (submitResult) return
    if (planToken) return
    router.push('/soul-audit')
  }, [submitResult, router, planToken])

  async function recordRunConsent(): Promise<string | null> {
    if (!submitResult) return null
    if (!crisisRequirementsMet) {
      setSelectionInlineError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before continuing.'
          : 'Unable to continue right now.',
      )
      setError(null)
      return null
    }

    setSelectionInlineError(null)
    setError(null)
    setRunExpired(false)

    try {
      const consentRes = await fetch('/api/soul-audit/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditRunId: submitResult.auditRunId,
          runToken: submitResult.runToken,
          essentialAccepted: true,
          analyticsOptIn: Boolean(siteConsent?.analyticsOptIn),
          crisisAcknowledged,
        }),
      })

      const payload = (await consentRes.json().catch(() => ({}))) as {
        error?: string
        code?: string
      }
      if (!consentRes.ok) {
        if (consentRes.status === 404 || payload.code === 'RUN_NOT_FOUND') {
          const recovered = await recoverExpiredRun({ silent: true })
          if (!recovered) {
            setRunExpired(true)
          }
        }
        throw new Error(payload.error || 'Consent could not be recorded.')
      }

      const consentPayload = payload as SoulAuditConsentResponse
      return consentPayload.consentToken
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Consent could not be recorded.',
      )
      return null
    }
  }

  function hasSeenGuestSignupGate(): boolean {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(GUEST_SIGNUP_GATE_KEY) === 'seen'
  }

  function markGuestSignupGateSeen() {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(GUEST_SIGNUP_GATE_KEY, 'seen')
  }

  async function submitConsentAndSelect(optionId: string) {
    if (
      authStateLoaded &&
      !authState.authenticated &&
      auditCount <= 1 &&
      !hasSeenGuestSignupGate()
    ) {
      setPendingOptionId(optionId)
      setGuestGateStep('signup')
      setGuestGateOpen(true)
      return
    }

    await submitConsentAndSelectInternal(optionId)
  }

  async function submitConsentAndSelectInternal(optionId: string) {
    if (!submitResult) return
    setSelectionInlineError(null)

    if (!crisisRequirementsMet) {
      setSelectionInlineError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before choosing a devotional path.'
          : 'Option selection is currently unavailable.',
      )
      setError(null)
      return
    }

    setSubmitting(true)
    setError(null)
    setRunExpired(false)

    try {
      const resolvedConsentToken = await recordRunConsent()
      if (!resolvedConsentToken) {
        setSubmitting(false)
        return
      }

      const selectRes = await fetch('/api/soul-audit/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'x-timezone-offset': String(new Date().getTimezoneOffset()),
        },
        body: JSON.stringify({
          auditRunId: submitResult.auditRunId,
          optionId,
          runToken: submitResult.runToken,
          consentToken: resolvedConsentToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      })

      const selectionPayload =
        (await selectRes.json()) as SoulAuditSelectResponse & {
          error?: string
          code?: string
        }
      if (!selectRes.ok || !selectionPayload.ok) {
        if (
          selectRes.status === 404 ||
          selectionPayload.error?.toLowerCase().includes('run not found')
        ) {
          const recovered = await recoverExpiredRun({ silent: true })
          if (!recovered) {
            setRunExpired(true)
          } else {
            throw new Error(
              'Your audit run expired. Fresh options were reloaded. Select your path again.',
            )
          }
        }
        throw new Error(
          selectionPayload.error || 'Unable to lock your devotional choice.',
        )
      }

      setSelection(selectionPayload)
      if (selectionPayload.planType === 'generative') {
        setIsGenerativePlan(true)
      }
      if (selectionPayload.onboardingMeta) {
        setPlanOnboardingMeta(selectionPayload.onboardingMeta)
      }
      sessionStorage.setItem(
        'soul-audit-selection-v2',
        JSON.stringify(selectionPayload),
      )

      if (selectionPayload.selectionType === 'curated_prefab') {
        router.push(selectionPayload.route)
        return
      }

      if (selectionPayload.planToken) {
        if (Array.isArray(selectionPayload.planDays)) {
          const safePlanDays = selectionPayload.planDays.filter(isFullPlanDay)
          if (safePlanDays.length > 0) {
            setPlanDays(safePlanDays)
            setLockedDayPreviews([])
            setLockedMessages([])
            persistPlanDays(selectionPayload.planToken, safePlanDays)
          }
        }
        router.push(selectionPayload.route)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to complete selection.'
      setSelectionInlineError(message)
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleGuestSoftOnboardingContinue() {
    if (!pendingOptionId) return

    setSabbathDay(guestSabbathDay)
    setTextScale(guestTextScale)
    setTheme(guestTheme)
    markGuestSignupGateSeen()
    setGuestGateOpen(false)

    void submitConsentAndSelectInternal(pendingOptionId)
    setPendingOptionId(null)
  }

  function redirectToSignUpFromGuestGate() {
    markGuestSignupGateSeen()
    setGuestGateOpen(false)

    const currentPath = `/soul-audit/results${
      searchParams.toString() ? `?${searchParams.toString()}` : ''
    }`
    router.push(`/auth/sign-up?redirect=${encodeURIComponent(currentPath)}`)
  }

  async function rerollOptions() {
    if (!submitResult || !lastAuditInput || !submitResult.runToken) {
      setError(
        'Reroll unavailable because your original audit text is not in session. Please start a new Soul Audit.',
      )
      return
    }
    if (rerollUsed) {
      setError('You already used your one reroll for this audit.')
      return
    }

    setIsRerolling(true)
    setSelectionInlineError(null)
    setError(null)
    setRunExpired(false)

    try {
      const response = await fetch('/api/soul-audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: lastAuditInput,
          rerollForRunId: submitResult.auditRunId,
          runToken: submitResult.runToken,
        }),
      })
      const payload = (await response.json()) as SoulAuditSubmitResponseV2 & {
        error?: string
      }
      if (!response.ok || payload.version !== 'v2') {
        throw new Error(
          payload.error || 'Unable to reroll options right now. Please retry.',
        )
      }

      setSubmitResult(payload)
      setSelection(null)
      setCrisisAcknowledged(false)
      setExpandedReasoningOptionId(null)
      setRerollUsed(true)

      sessionStorage.setItem('soul-audit-submit-v2', JSON.stringify(payload))
      sessionStorage.removeItem('soul-audit-selection-v2')
      sessionStorage.setItem(REROLL_USED_SESSION_KEY, 'true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reroll options.')
    } finally {
      setIsRerolling(false)
    }
  }

  async function recoverExpiredRun(options?: {
    silent?: boolean
  }): Promise<boolean> {
    const silent = Boolean(options?.silent)
    if (!lastAuditInput) {
      if (!silent) {
        setError(
          'Run expired and no previous response was found in this browser session. Please restart Soul Audit.',
        )
      }
      return false
    }
    if (!submitResult?.auditRunId || !submitResult.runToken) {
      if (!silent) {
        setError(
          'Run details expired and could not be verified. Please restart Soul Audit.',
        )
      }
      return false
    }

    if (!silent) {
      setSubmitting(true)
      setSelectionInlineError(null)
      setError(null)
    }
    try {
      const response = await fetch('/api/soul-audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: lastAuditInput,
          rerollForRunId: submitResult.auditRunId,
          runToken: submitResult.runToken,
        }),
      })
      const payload = (await response.json()) as SoulAuditSubmitResponseV2 & {
        error?: string
      }
      if (!response.ok || payload.version !== 'v2') {
        throw new Error(payload.error || 'Unable to recover options right now.')
      }

      setSubmitResult(payload)
      setSelection(null)
      setRunExpired(false)
      setCrisisAcknowledged(false)
      setExpandedReasoningOptionId(null)
      setRerollUsed(false)
      sessionStorage.setItem('soul-audit-submit-v2', JSON.stringify(payload))
      sessionStorage.removeItem('soul-audit-selection-v2')
      sessionStorage.removeItem(REROLL_USED_SESSION_KEY)
      return true
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to recover options right now.',
        )
      }
      return false
    } finally {
      if (!silent) {
        setSubmitting(false)
      }
    }
  }

  function saveOptionForLater(option: {
    id: string
    kind: 'ai_primary' | 'ai_generative' | 'curated_prefab'
    title: string
    question: string
    reasoning: string
    preview?: { verse: string; verseText?: string; paragraph: string } | null
  }) {
    if (!submitResult) return
    const nextEntry: SavedAuditOption = {
      id: option.id,
      auditRunId: submitResult.auditRunId,
      kind: option.kind,
      title: option.title,
      question: option.question,
      reasoning: option.reasoning,
      verse: option.preview?.verse,
      verseText: option.preview?.verseText,
      paragraph: option.preview?.paragraph,
      savedAt: new Date().toISOString(),
    }

    setSavedOptions((current) => {
      if (current.some((entry) => entry.id === nextEntry.id)) {
        setSavedOptionsMessage('Already saved.')
        window.setTimeout(() => setSavedOptionsMessage(null), 1600)
        return current
      }
      const next = [nextEntry, ...current].slice(0, 24)
      persistSavedAuditOptions(next)
      setSavedOptionsMessage('Saved for later.')
      window.setTimeout(() => setSavedOptionsMessage(null), 1600)
      return next
    })
  }

  function removeSavedOption(id: string) {
    setSavedOptions((current) => {
      const next = current.filter((entry) => entry.id !== id)
      persistSavedAuditOptions(next)
      return next
    })
  }

  function cleanSavedOptions() {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    setSavedOptions((current) => {
      const next = current.filter(
        (entry) => new Date(entry.savedAt).getTime() >= cutoff,
      )
      persistSavedAuditOptions(next)
      return next
    })
  }

  const hasStaleSavedOptions = savedOptions.some(
    (entry) =>
      Date.now() - new Date(entry.savedAt).getTime() > 30 * 24 * 60 * 60 * 1000,
  )
  const displayOptions = useMemo(() => {
    if (!submitResult) return []
    return submitResult.options.map((option) => ({
      ...option,
      title: sanitizeLegacyDisplayText(option.title),
      question: sanitizeLegacyDisplayText(option.question),
      reasoning: sanitizeLegacyDisplayText(option.reasoning),
      preview: option.preview
        ? {
            ...option.preview,
            paragraph: sanitizeLegacyDisplayText(option.preview.paragraph),
          }
        : option.preview,
    }))
  }, [submitResult])

  async function savePlanDayBookmark(day: CustomPlanDay) {
    if (!planToken) return
    setBookmarkingDay(day.day)
    setSavedDay(null)

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalSlug: `plan-${planToken}-day-${day.day}`,
          note: day.title,
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        throw new Error(
          payload.error ||
            (payload.code === 'AUTH_REQUIRED_SAVE_STATE'
              ? 'Sign in is required before saving bookmarks.'
              : 'Unable to save bookmark.'),
        )
      }
      setSavedDay(day.day)
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
      window.setTimeout(() => {
        setSavedDay((current) => (current === day.day ? null : current))
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save bookmark.')
    } finally {
      setBookmarkingDay((current) => (current === day.day ? null : current))
    }
  }

  function switchToDay(dayNumber: number) {
    if (!planToken) return
    setSelectedDayNumber(dayNumber)

    const params = new URLSearchParams(searchParams.toString())
    params.set('planToken', planToken)
    params.set('day', String(dayNumber))
    router.replace(`/soul-audit/results?${params.toString()}`, {
      scroll: false,
    })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  async function handleResetAudit() {
    setSelectionInlineError(null)
    setError(null)
    sessionStorage.removeItem('soul-audit-result')
    sessionStorage.removeItem('soul-audit-submit-v2')
    sessionStorage.removeItem('soul-audit-selection-v2')
    sessionStorage.removeItem(LAST_AUDIT_INPUT_SESSION_KEY)
    sessionStorage.removeItem(REROLL_USED_SESSION_KEY)

    try {
      await fetch('/api/soul-audit/reset', { method: 'POST' })
    } catch {
      // continue local reset
    }

    router.push('/soul-audit')
  }

  const onboardingKicker = onboardingLabel(planOnboardingMeta)
  const onboardingBlurb = onboardingDescription(planOnboardingMeta)
  const cycleStartLabel =
    planOnboardingMeta &&
    formatCycleStart(
      planOnboardingMeta.cycleStartAt,
      planOnboardingMeta.timezone,
    )

  if (!submitResult && !planToken) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader />
          <section className="mock-panel">
            <div className="flex min-h-[40vh] items-center justify-center">
              <p className="text-muted">Loading...</p>
            </div>
          </section>
          <SiteFooter />
        </main>
      </div>
    )
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        {planToken && <ScrollProgress showLabel />}
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="mx-auto w-full max-w-6xl shell-content-pad">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: 'SOUL AUDIT', href: '/soul-audit' },
                { label: 'RESULTS' },
              ]}
            />
            <FadeIn>
              <header className="mb-10 text-center">
                <p className="text-label vw-small mb-4 text-gold">SOUL AUDIT</p>
                <h1 className="vw-heading-md">
                  {typographer(
                    planToken
                      ? 'Your devotional path is now active.'
                      : 'Choose your devotional path.',
                  )}
                </h1>
                {!planToken && (
                  <p className="vw-small mt-3 text-secondary">
                    Tap a card to continue. Each option is clickable.
                  </p>
                )}
                {!planToken && (
                  <p className="vw-small mt-3 text-muted">
                    We built options from a short input. Add one more sentence
                    for more precise curation.
                  </p>
                )}
                {planToken && onboardingKicker && onboardingBlurb && (
                  <div
                    className="mx-auto mt-5 max-w-3xl border px-4 py-3 text-left"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small text-gold">
                      {onboardingKicker}
                    </p>
                    <p className="vw-small mt-2 text-secondary">
                      {typographer(onboardingBlurb)}
                    </p>
                    {cycleStartLabel && (
                      <p className="vw-small mt-2 text-muted">
                        Full 5-day cycle unlock: {cycleStartLabel}
                      </p>
                    )}
                  </div>
                )}
              </header>
            </FadeIn>

            {!planToken && submitResult && (
              <>
                {submitResult.crisis.required && (
                  <FadeIn>
                    <section
                      className="mb-6 rounded-none border p-6"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div>
                        <p className="text-label vw-small mb-2 text-gold">
                          CRISIS SUPPORT
                        </p>
                        <p className="vw-small mb-2 text-secondary">
                          {typographer(submitResult.crisis.prompt)}
                        </p>
                        <div className="grid gap-2">
                          {submitResult.crisis.resources.map((resource) => {
                            const href = crisisResourceHref(resource)
                            return (
                              <p
                                key={resource.name}
                                className="vw-small text-secondary"
                              >
                                <span className="text-label vw-small text-gold">
                                  {resource.name}:
                                </span>{' '}
                                {href ? (
                                  <a
                                    href={href}
                                    className="link-highlight"
                                    rel="noreferrer"
                                  >
                                    {resource.contact}
                                  </a>
                                ) : (
                                  resource.contact
                                )}
                              </p>
                            )
                          })}
                        </div>
                        <a
                          href="tel:988"
                          className="text-label vw-small link-highlight mt-3 inline-block"
                        >
                          I NEED IMMEDIATE HELP NOW
                        </a>
                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={crisisAcknowledged}
                            onChange={(e) =>
                              setCrisisAcknowledged(e.target.checked)
                            }
                          />
                          <span className="vw-small">
                            I acknowledge the crisis resources above before
                            continuing to devotional options.
                          </span>
                        </label>
                      </div>
                    </section>
                  </FadeIn>
                )}

                {selectionInlineError && (
                  <FadeIn>
                    <div
                      className="soul-audit-selection-error mb-6"
                      role="alert"
                    >
                      <p className="vw-small text-secondary">
                        {typographer(selectionInlineError)}
                      </p>
                    </div>
                  </FadeIn>
                )}

                {guestGateOpen && (
                  <FadeIn>
                    <section
                      className="mb-6 rounded-sm bg-surface-raised p-5"
                      style={{ border: '1px solid var(--color-border)' }}
                      aria-live="polite"
                    >
                      {guestGateStep === 'signup' ? (
                        <div className="grid gap-4">
                          <p className="text-label vw-small text-gold">
                            SAVE YOUR FIRST AUDIT
                          </p>
                          <p className="vw-small text-secondary">
                            Create an account before entering your devotional so
                            this first path is saved across devices.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="text-label vw-small px-5 py-2"
                              style={{
                                border: '1px solid var(--color-border)',
                              }}
                              onClick={redirectToSignUpFromGuestGate}
                            >
                              Sign up now
                            </button>
                            <button
                              type="button"
                              className="text-label vw-small px-5 py-2"
                              style={{
                                border: '1px solid var(--color-border)',
                              }}
                              onClick={() => setGuestGateStep('onboarding')}
                            >
                              Continue as guest
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          <p className="text-label vw-small text-gold">
                            QUICK GUEST SETUP
                          </p>
                          <p className="vw-small text-secondary">
                            Choose a Sabbath day and reading defaults before
                            entering this devotional.
                          </p>
                          <div className="grid gap-3">
                            <p className="text-label vw-small text-gold">
                              Sabbath day
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(['saturday', 'sunday'] as const).map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  className="text-label vw-small px-4 py-2"
                                  style={{
                                    border: '1px solid var(--color-border)',
                                    background:
                                      guestSabbathDay === day
                                        ? 'var(--color-fg)'
                                        : 'transparent',
                                    color:
                                      guestSabbathDay === day
                                        ? 'var(--color-bg)'
                                        : 'var(--color-text-primary)',
                                  }}
                                  onClick={() => setGuestSabbathDay(day)}
                                >
                                  {day[0].toUpperCase() + day.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <p className="text-label vw-small text-gold">
                              Theme
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(['dark', 'light', 'system'] as const).map(
                                (theme) => (
                                  <button
                                    key={theme}
                                    type="button"
                                    className="text-label vw-small px-4 py-2"
                                    style={{
                                      border: '1px solid var(--color-border)',
                                      background:
                                        guestTheme === theme
                                          ? 'var(--color-fg)'
                                          : 'transparent',
                                      color:
                                        guestTheme === theme
                                          ? 'var(--color-bg)'
                                          : 'var(--color-text-primary)',
                                    }}
                                    onClick={() => setGuestTheme(theme)}
                                  >
                                    {theme[0].toUpperCase() + theme.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <p className="text-label vw-small text-gold">
                              Text size
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(['default', 'large', 'xlarge'] as const).map(
                                (scale) => (
                                  <button
                                    key={scale}
                                    type="button"
                                    className="text-label vw-small px-4 py-2"
                                    style={{
                                      border: '1px solid var(--color-border)',
                                      background:
                                        guestTextScale === scale
                                          ? 'var(--color-fg)'
                                          : 'transparent',
                                      color:
                                        guestTextScale === scale
                                          ? 'var(--color-bg)'
                                          : 'var(--color-text-primary)',
                                    }}
                                    onClick={() => setGuestTextScale(scale)}
                                  >
                                    {scale === 'xlarge'
                                      ? 'XLarge'
                                      : scale[0].toUpperCase() + scale.slice(1)}
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 pt-2">
                            <button
                              type="button"
                              className="text-label vw-small px-5 py-2"
                              style={{
                                border: '1px solid var(--color-border)',
                              }}
                              onClick={handleGuestSoftOnboardingContinue}
                            >
                              Continue to devotional
                            </button>
                            <button
                              type="button"
                              className="text-label vw-small px-5 py-2"
                              style={{
                                border: '1px solid var(--color-border)',
                              }}
                              onClick={() => setGuestGateStep('signup')}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  </FadeIn>
                )}

                <FadeIn>
                  <section className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-label vw-small text-gold">
                        {displayOptions.some((o) => o.kind === 'ai_generative')
                          ? '3 AI GENERATED PATHS'
                          : '3 PRIMARY AI OPTIONS'}
                      </p>
                      <p className="vw-small text-muted">
                        {submitResult.remainingAudits} audits remaining this
                        cycle
                      </p>
                    </div>
                    {!optionSelectionReady && (
                      <p className="vw-small mb-4 text-secondary">
                        {submitResult.crisis.required && !crisisAcknowledged
                          ? 'Acknowledge crisis resources to unlock option selection.'
                          : 'Option selection is currently unavailable.'}
                      </p>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      {displayOptions
                        .filter(
                          (option) =>
                            option.kind === 'ai_primary' ||
                            option.kind === 'ai_generative',
                        )
                        .map((option) => {
                          const hero = SERIES_HERO[option.slug]
                          const series = SERIES_DATA[option.slug]
                          const keywords = (series?.keywords ?? []).slice(0, 3)
                          const isGenerative = option.kind === 'ai_generative'
                          const dayCount = isGenerative
                            ? 7
                            : (series?.days.length ?? 0)

                          return (
                            <article
                              key={option.id}
                              className="audit-option-card audit-option-card-large group relative overflow-hidden text-left"
                            >
                              <button
                                type="button"
                                disabled={!optionSelectionReady}
                                onClick={() =>
                                  void submitConsentAndSelect(option.id)
                                }
                                className={`w-full text-left ${
                                  optionSelectionReady
                                    ? 'cursor-pointer'
                                    : 'is-disabled'
                                }`}
                                aria-disabled={!optionSelectionReady}
                              >
                                {/* Ref -> Title -> Image -> Keywords -> Action */}
                                {option.preview?.verse && (
                                  <div className="mock-scripture-lead audit-option-pad">
                                    <p className="mock-scripture-lead-reference">
                                      {typographer(option.preview.verse)}
                                    </p>
                                  </div>
                                )}
                                <h3 className="audit-option-title audit-option-pad">
                                  {option.title}.
                                </h3>
                                {hero && (
                                  <div
                                    className="series-card-thumbnail"
                                    aria-hidden="true"
                                  >
                                    <Image
                                      src={hero.rawSrc}
                                      alt=""
                                      width={600}
                                      height={450}
                                      className="series-card-thumbnail-img"
                                      loading="lazy"
                                      sizes="(max-width: 767px) 84vw, 33vw"
                                    />
                                  </div>
                                )}
                                {keywords.length > 0 && (
                                  <p className="series-card-keywords audit-option-pad">
                                    {keywords.join(' \u2022 ')}
                                  </p>
                                )}
                                <div className="mock-featured-actions audit-option-pad">
                                  <span className="mock-series-start text-label">
                                    {optionSelectionReady
                                      ? isGenerative
                                        ? 'GENERATE THIS PATH'
                                        : 'BUILD THIS PATH'
                                      : 'UNAVAILABLE'}
                                  </span>
                                  {dayCount > 0 && (
                                    <span className="mock-featured-days text-label">
                                      {dayCount}{' '}
                                      {dayCount === 1 ? 'DAY' : 'DAYS'}
                                    </span>
                                  )}
                                </div>
                              </button>
                              <div className="audit-option-meta audit-option-pad">
                                <button
                                  type="button"
                                  className="audit-option-meta-link link-highlight mr-4"
                                  onClick={() => saveOptionForLater(option)}
                                >
                                  Save for later
                                </button>
                                <button
                                  type="button"
                                  className="audit-option-meta-link link-highlight"
                                  onClick={() =>
                                    setExpandedReasoningOptionId((current) =>
                                      current === option.id ? null : option.id,
                                    )
                                  }
                                >
                                  {expandedReasoningOptionId === option.id
                                    ? 'Hide reasoning'
                                    : 'Why this path?'}
                                </button>
                                {expandedReasoningOptionId === option.id && (
                                  <p className="audit-option-support mt-2 text-secondary">
                                    {typographer(option.reasoning)}
                                  </p>
                                )}
                              </div>
                              <span className="audit-option-underline" />
                            </article>
                          )
                        })}
                    </div>
                  </section>
                </FadeIn>

                <FadeIn>
                  <section className="mb-7">
                    <p className="text-label vw-small mb-4 text-gold">
                      2 CURATED STARTER PATHS
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {displayOptions
                        .filter((option) => option.kind === 'curated_prefab')
                        .map((option) => {
                          const series = SERIES_DATA[option.slug]
                          const keywords = (series?.keywords ?? []).slice(0, 3)
                          const dayCount = series?.days.length ?? 0

                          return (
                            <article
                              key={option.id}
                              className="audit-option-card audit-option-card-small group relative overflow-hidden text-left"
                            >
                              <button
                                type="button"
                                disabled={!optionSelectionReady}
                                onClick={() =>
                                  void submitConsentAndSelect(option.id)
                                }
                                className={`w-full text-left ${
                                  optionSelectionReady
                                    ? 'cursor-pointer'
                                    : 'is-disabled'
                                }`}
                                aria-disabled={!optionSelectionReady}
                              >
                                {/* Small variant: Title → Keywords → Action */}
                                <h3 className="audit-option-title">
                                  {option.title}.
                                </h3>
                                {keywords.length > 0 && (
                                  <p className="series-card-keywords">
                                    {keywords.join(' \u2022 ')}
                                  </p>
                                )}
                                <div className="mock-featured-actions">
                                  <span className="mock-series-start text-label">
                                    {optionSelectionReady
                                      ? 'OPEN SERIES'
                                      : 'UNAVAILABLE'}
                                  </span>
                                  {dayCount > 0 && (
                                    <span className="mock-featured-days text-label">
                                      {dayCount}{' '}
                                      {dayCount === 1 ? 'DAY' : 'DAYS'}
                                    </span>
                                  )}
                                </div>
                              </button>
                              <div className="audit-option-meta">
                                <button
                                  type="button"
                                  className="audit-option-meta-link link-highlight mr-4"
                                  onClick={() => saveOptionForLater(option)}
                                >
                                  Save for later
                                </button>
                                <button
                                  type="button"
                                  className="audit-option-meta-link link-highlight"
                                  onClick={() =>
                                    setExpandedReasoningOptionId((current) =>
                                      current === option.id ? null : option.id,
                                    )
                                  }
                                >
                                  {expandedReasoningOptionId === option.id
                                    ? 'Hide reasoning'
                                    : 'Why this path?'}
                                </button>
                                {expandedReasoningOptionId === option.id && (
                                  <p className="audit-option-support mt-2 text-secondary">
                                    {typographer(option.reasoning)}
                                  </p>
                                )}
                              </div>
                              <span className="audit-option-underline" />
                            </article>
                          )
                        })}
                    </div>
                  </section>
                </FadeIn>

                {savedOptions.length > 0 && (
                  <FadeIn>
                    <section
                      className="mb-7 border p-4"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-label vw-small text-gold">
                          SAVED PATHS
                        </p>
                        {hasStaleSavedOptions && (
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={cleanSavedOptions}
                          >
                            Monthly clean house
                          </button>
                        )}
                      </div>
                      <div className="mt-3 grid gap-2">
                        {savedOptions.slice(0, 6).map((saved) => {
                          const verseSnippet = resolveVerseSnippet(
                            saved.verseText,
                            saved.paragraph,
                          )

                          return (
                            <div
                              key={`saved-option-${saved.id}`}
                              className="border px-3 py-2"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                {saved.verse && (
                                  <p className="audit-option-verse w-full">
                                    {typographer(saved.verse)}
                                  </p>
                                )}
                                {verseSnippet && (
                                  <p className="audit-option-verse-snippet w-full">
                                    {typographer(verseSnippet)}
                                  </p>
                                )}
                                <p className="audit-option-title text-gold">
                                  {saved.title}
                                </p>
                                <button
                                  type="button"
                                  className="audit-option-meta-link link-highlight"
                                  onClick={() => removeSavedOption(saved.id)}
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="audit-option-support mt-1 text-secondary">
                                {typographer(saved.question)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      {savedOptionsMessage && (
                        <p className="vw-small mt-2 text-muted">
                          {savedOptionsMessage}
                        </p>
                      )}
                    </section>
                  </FadeIn>
                )}

                <FadeIn>
                  <section
                    className="mb-7 border p-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-label vw-small text-gold">REROLL</p>
                      <p className="vw-small text-muted">
                        {rerollsRemaining}/1 left
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="cta-major text-label vw-small px-4 py-2 disabled:opacity-50"
                        onClick={() => void rerollOptions()}
                        disabled={rerollUsed || isRerolling || submitting}
                        title="Reroll discards the current five options and gives you one new set."
                      >
                        {isRerolling
                          ? 'Rerolling...'
                          : rerollUsed
                            ? 'Reroll Used'
                            : 'Reroll Options'}
                      </button>
                      <p className="vw-small text-secondary">
                        One reroll per audit run.
                      </p>
                    </div>
                  </section>
                </FadeIn>
              </>
            )}

            {planToken && (
              <>
                {railDays.length > 0 && (
                  <section
                    className="mb-6 border p-3"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small mb-2 text-gold">
                      DAY STRIP
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {railDays.map((day) => {
                        const isSelected = day.day === selectedDayNumber
                        const isPending =
                          day.generationStatus === 'pending' ||
                          day.generationStatus === 'generating'
                        const isFailed = day.generationStatus === 'failed'
                        return (
                          <button
                            key={`top-day-${day.day}`}
                            type="button"
                            onClick={() => switchToDay(day.day)}
                            disabled={isPending}
                            className="text-label vw-small border px-3 py-2"
                            style={{
                              borderColor: isSelected
                                ? 'var(--color-border-strong)'
                                : 'var(--color-border)',
                              background: isSelected
                                ? 'var(--color-active)'
                                : 'transparent',
                              opacity: day.locked || isPending ? 0.72 : 1,
                            }}
                          >
                            DAY {day.day}
                            {day.locked
                              ? ' \u00B7 LOCKED'
                              : isPending
                                ? ' \u00B7 BUILDING'
                                : isFailed
                                  ? ' \u00B7 FAILED'
                                  : ''}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                <section className="md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-8">
                  <aside className="mb-6 md:mb-0">
                    <div
                      className="shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="text-label vw-small mb-3 text-gold">
                        DEVOTIONAL TIMELINE
                      </p>
                      <div className="grid gap-2">
                        {railDays.map((day) => {
                          const isSelected = day.day === selectedDayNumber
                          const isPending =
                            day.generationStatus === 'pending' ||
                            day.generationStatus === 'generating'
                          const isFailed = day.generationStatus === 'failed'
                          return (
                            <button
                              key={`rail-day-${day.day}`}
                              type="button"
                              className="border px-3 py-2 text-left"
                              disabled={isPending}
                              style={{
                                borderColor: isSelected
                                  ? 'var(--color-border-strong)'
                                  : 'var(--color-border)',
                                background: isSelected
                                  ? 'var(--color-active)'
                                  : 'transparent',
                                opacity: day.locked || isPending ? 0.72 : 1,
                              }}
                              onClick={() => switchToDay(day.day)}
                            >
                              <p className="text-label vw-small text-gold">
                                DAY {day.day}
                                {day.locked
                                  ? ' \u00B7 LOCKED'
                                  : isPending
                                    ? ' \u00B7 BUILDING'
                                    : isFailed
                                      ? ' \u00B7 FAILED'
                                      : ''}
                              </p>
                              <p className="vw-small text-secondary">
                                {isPending
                                  ? 'Generating content...'
                                  : typographer(day.title)}
                              </p>
                              {!isPending && day.scriptureReference && (
                                <p className="vw-small text-muted">
                                  {day.scriptureReference}
                                </p>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {daySectionAnchors.length > 0 && (
                        <div
                          className="mt-5 border-t pt-4"
                          style={{ borderColor: 'var(--color-border)' }}
                        >
                          <p className="text-label vw-small mb-3 text-gold">
                            SECTION TIMELINE
                          </p>
                          <ReaderTimeline anchors={daySectionAnchors} />
                        </div>
                      )}

                      <div
                        className="mt-5 border-t pt-4"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <p className="text-label vw-small mb-3 text-gold">
                          ARCHIVE
                        </p>
                        {archiveForRail.length === 0 ? (
                          <p className="vw-small text-muted">
                            No previous AI devotional plans yet.
                          </p>
                        ) : (
                          <div className="grid gap-2">
                            {archiveForRail.slice(0, 6).map((plan) => (
                              <Link
                                key={`archive-${plan.planToken}`}
                                href={plan.route}
                                className="block border px-3 py-2 text-secondary"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                <p className="text-label vw-small text-gold">
                                  PLAN
                                </p>
                                <p className="vw-small">
                                  {formatShortDate(plan.createdAt)}
                                </p>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>

                  <div className="devotional-reader-stage">
                    {loadingPlan && !isGenerativePlan && (
                      <p className="vw-body mb-6 text-secondary">
                        Building your day-by-day devotional path...
                      </p>
                    )}

                    {isGenerativePlan &&
                      generationProgress &&
                      generationProgress.status !== 'complete' && (
                        <div className="mb-6">
                          <p className="vw-small text-secondary">
                            Generating your personalized devotional plan:{' '}
                            {generationProgress.completedDays} of{' '}
                            {generationProgress.totalDays} days ready.
                          </p>
                          <div
                            className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                            style={{ background: 'var(--color-border)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(generationProgress.completedDays / generationProgress.totalDays) * 100}%`,
                                background: 'var(--color-gold)',
                              }}
                            />
                          </div>
                        </div>
                      )}

                    {lockedMessages.length > 0 && (
                      <div className="mb-6 space-y-2">
                        {lockedMessages.map((message, index) => (
                          <p
                            key={`${message}-${index}`}
                            className="vw-small text-secondary"
                          >
                            {message}
                          </p>
                        ))}
                      </div>
                    )}

                    {selectedPlanDay ? (
                      <>
                        {selectedPlanDaySlug && (
                          <DevotionalStickiesLayer
                            devotionalSlug={selectedPlanDaySlug}
                          />
                        )}
                        <article
                          key={`plan-day-${selectedPlanDay.day}`}
                          style={{
                            border: '1px solid var(--color-border)',
                            padding: '1.5rem',
                          }}
                        >
                          <p className="text-label vw-small mb-2 text-gold">
                            DAY {selectedPlanDay.day}
                            {selectedPlanDay.dayType === 'sabbath'
                              ? ' \u00B7 SABBATH'
                              : selectedPlanDay.dayType === 'review'
                                ? ' \u00B7 REVIEW'
                                : ''}
                          </p>
                          <h2 className="vw-heading-md mb-2">
                            {typographer(selectedPlanDay.title)}
                          </h2>
                          <p className="vw-small mb-4 text-muted">
                            {selectedPlanDay.scriptureReference}
                          </p>

                          {/* Render modules if present (generative plans) */}
                          {selectedPlanDay.modules &&
                          selectedPlanDay.modules.length > 0 ? (
                            <div className="space-y-4">
                              {selectedPlanDay.modules.map((mod, idx) => (
                                <div
                                  key={`mod-${selectedPlanDay.day}-${mod.type}-${idx}`}
                                  id={
                                    mod.type === 'scripture'
                                      ? `day-${selectedPlanDay.day}-scripture`
                                      : mod.type === 'reflection'
                                        ? `day-${selectedPlanDay.day}-reflection`
                                        : mod.type === 'prayer'
                                          ? `day-${selectedPlanDay.day}-prayer`
                                          : undefined
                                  }
                                >
                                  {mod.heading && (
                                    <p className="text-label vw-small mb-1 text-gold">
                                      {mod.heading.toUpperCase()}
                                    </p>
                                  )}
                                  <div className="vw-body text-secondary type-prose">
                                    {typographer(
                                      extractModuleText(mod.content),
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <p
                                id={`day-${selectedPlanDay.day}-scripture`}
                                className="scripture-block vw-body mb-4 text-secondary"
                              >
                                {typographer(selectedPlanDay.scriptureText)}
                              </p>
                              <p
                                id={`day-${selectedPlanDay.day}-reflection`}
                                className="vw-body mb-4 text-secondary type-prose"
                              >
                                {typographer(selectedPlanDay.reflection)}
                              </p>
                              <p
                                id={`day-${selectedPlanDay.day}-prayer`}
                                className="text-serif-italic vw-body mb-4 text-secondary type-prose"
                              >
                                {typographer(selectedPlanDay.prayer)}
                              </p>
                            </>
                          )}

                          <div
                            id={`day-${selectedPlanDay.day}-practice`}
                            className="mt-4 grid gap-4 md:grid-cols-2"
                          >
                            {selectedPlanDay.nextStep && (
                              <p className="vw-small text-secondary">
                                <strong className="text-gold">
                                  NEXT STEP:{' '}
                                </strong>
                                {typographer(selectedPlanDay.nextStep)}
                              </p>
                            )}
                            {selectedPlanDay.journalPrompt && (
                              <p
                                id={`day-${selectedPlanDay.day}-journal`}
                                className="vw-small text-secondary"
                              >
                                <strong className="text-gold">JOURNAL: </strong>
                                {typographer(selectedPlanDay.journalPrompt)}
                              </p>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="text-label vw-small link-highlight"
                              disabled={bookmarkingDay === selectedPlanDay.day}
                              onClick={() =>
                                void savePlanDayBookmark(selectedPlanDay)
                              }
                            >
                              {savedDay === selectedPlanDay.day
                                ? 'BOOKMARK SAVED'
                                : bookmarkingDay === selectedPlanDay.day
                                  ? 'SAVING...'
                                  : 'SAVE BOOKMARK'}
                            </button>
                            <span className="vw-small text-muted">
                              Highlight any line to save a favorite verse.
                            </span>
                          </div>
                          {selectedPlanDay.compositionReport && (
                            <div
                              className="mt-4 border-t pt-3"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <p className="vw-small text-muted">
                                {
                                  selectedPlanDay.compositionReport
                                    .referencePercentage
                                }
                                % reference material{' \u00B7 '}
                                {
                                  selectedPlanDay.compositionReport
                                    .generatedPercentage
                                }
                                % generated{' \u00B7 '}
                                {
                                  selectedPlanDay.compositionReport.sources
                                    .length
                                }{' '}
                                sources
                              </p>
                            </div>
                          )}
                          {(selectedPlanDay.endnotes?.length ?? 0) > 0 && (
                            <div className="mt-5 border-t pt-4">
                              <p className="text-label vw-small mb-2 text-gold">
                                ENDNOTES
                              </p>
                              {selectedPlanDay.endnotes?.map((note) => (
                                <p
                                  key={`${selectedPlanDay.day}-endnote-${note.id}`}
                                  className="vw-small text-muted"
                                >
                                  [{note.id}] {note.source} — {note.note}
                                </p>
                              ))}
                            </div>
                          )}
                        </article>
                      </>
                    ) : selectedRailDay &&
                      (selectedRailDay.generationStatus === 'pending' ||
                        selectedRailDay.generationStatus === 'generating') ? (
                      <article
                        style={{
                          border: '1px solid var(--color-border)',
                          padding: '1.5rem',
                        }}
                      >
                        <p className="text-label vw-small mb-2 text-gold">
                          DAY {selectedRailDay.day} \u00B7 BUILDING
                        </p>
                        <h2 className="vw-heading-md mb-2">
                          Generating your devotional...
                        </h2>
                        <div className="space-y-3">
                          <div
                            className="h-4 animate-pulse rounded"
                            style={{
                              background: 'var(--color-border)',
                              width: '80%',
                            }}
                          />
                          <div
                            className="h-4 animate-pulse rounded"
                            style={{
                              background: 'var(--color-border)',
                              width: '65%',
                            }}
                          />
                          <div
                            className="h-4 animate-pulse rounded"
                            style={{
                              background: 'var(--color-border)',
                              width: '90%',
                            }}
                          />
                        </div>
                        <p className="vw-small mt-4 text-muted">
                          Each day is built from reference material and
                          personalized to your reflection. This can take up to
                          90 seconds.
                        </p>
                        {generationProgress && (
                          <p className="vw-small mt-2 text-muted">
                            {generationProgress.completedDays} of{' '}
                            {generationProgress.totalDays} days complete
                          </p>
                        )}
                      </article>
                    ) : selectedRailDay?.locked ? (
                      <article
                        style={{
                          border: '1px solid var(--color-border)',
                          padding: '1.5rem',
                        }}
                      >
                        <p className="text-label vw-small mb-2 text-gold">
                          DAY {selectedRailDay.day} · LOCKED
                        </p>
                        <h2 className="vw-heading-md mb-2">
                          {typographer(selectedRailDay.title)}
                        </h2>
                        {selectedRailDay.scriptureReference && (
                          <p className="vw-small mb-4 text-muted">
                            {selectedRailDay.scriptureReference}
                          </p>
                        )}
                        <p className="vw-body text-secondary">
                          This day is visible in your timeline and will unlock
                          on schedule.
                        </p>
                      </article>
                    ) : (
                      <p className="vw-body text-secondary">
                        Select a day from the timeline to continue.
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}

            {error && (
              <div className="mt-6 text-center">
                <p className="vw-body text-secondary">{error}</p>
                {runExpired && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void recoverExpiredRun()}
                      disabled={
                        submitting ||
                        !lastAuditInput ||
                        !submitResult?.auditRunId ||
                        !submitResult?.runToken
                      }
                      className="cta-major text-label vw-small px-5 py-2 disabled:opacity-50"
                    >
                      {submitting ? 'Reloading...' : 'Reload Options'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.removeItem('soul-audit-submit-v2')
                        sessionStorage.removeItem('soul-audit-selection-v2')
                        sessionStorage.removeItem(LAST_AUDIT_INPUT_SESSION_KEY)
                        sessionStorage.removeItem(REROLL_USED_SESSION_KEY)
                        void fetch('/api/soul-audit/reset', {
                          method: 'POST',
                        }).catch(() => {})
                        router.push('/soul-audit')
                      }}
                      className="text-label vw-small link-highlight"
                    >
                      Restart Soul Audit
                    </button>
                  </div>
                )}
              </div>
            )}

            {(submitResult || planToken) && (
              <div className="mt-10 text-center">
                <button
                  type="button"
                  className="mock-reset-btn text-label"
                  onClick={() => void handleResetAudit()}
                >
                  RESET AUDIT
                </button>
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-center">
              <Link
                href="/daily-bread"
                className="text-label vw-small link-highlight"
              >
                Daily Bread Home
              </Link>
              <Link
                href="/series"
                className="text-label vw-small link-highlight"
              >
                Browse All Series
              </Link>
              <Link
                href="/soul-audit"
                className="text-label vw-small link-highlight"
              >
                New Soul Audit
              </Link>
            </div>
          </div>
        </section>
        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
      {selectedPlanDaySlug && (
        <TextHighlightTrigger devotionalSlug={selectedPlanDaySlug} />
      )}
    </div>
  )
}
