'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import DevotionalStickiesLayer from '@/components/DevotionalStickiesLayer'
import ScrollProgress from '@/components/ScrollProgress'
import { type ReaderSectionAnchor } from '@/components/ReaderTimeline'
import FadeIn from '@/components/motion/FadeIn'
import AuditOptionCard from '@/components/soul-audit/AuditOptionCard'
import AuditRerollSection from '@/components/soul-audit/AuditRerollSection'
import CrisisResourceBanner from '@/components/soul-audit/CrisisResourceBanner'
import GuestSignupGate from '@/components/soul-audit/GuestSignupGate'
import PlanDayContent from '@/components/soul-audit/PlanDayContent'
import PlanDayRail from '@/components/soul-audit/PlanDayRail'
import SavedPathsList from '@/components/soul-audit/SavedPathsList'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import {
  SITE_CONSENT_UPDATED_EVENT,
  readSiteConsentFromDocument,
  type SiteConsent,
} from '@/lib/site-consent'
import { typographer } from '@/lib/typographer'
import type {
  CustomPlanDay,
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
  const [selectingOptionId, setSelectingOptionId] = useState<string | null>(
    null,
  )
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
    void loadPlan(planToken)
  }, [loadPlan, planToken])

  useEffect(() => {
    if (!planToken) return
    let cancelled = false

    async function loadArchive() {
      try {
        const response = await fetch('/api/soul-audit/manage', {
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
      }
    >()

    for (const day of planDays) {
      byDay.set(day.day, {
        day: day.day,
        title: day.title,
        scriptureReference: day.scriptureReference,
        locked: false,
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

    return Array.from(byDay.values()).sort((a, b) => a.day - b.day)
  }, [lockedDayPreviews, planDays])

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
    setSelectingOptionId(optionId)

    if (!crisisRequirementsMet) {
      setSelectionInlineError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before choosing a devotional path.'
          : 'Option selection is currently unavailable.',
      )
      setError(null)
      setSelectingOptionId(null)
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
      setSelectingOptionId(null)
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
      await fetch('/api/soul-audit/manage', { method: 'POST' })
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
                  <CrisisResourceBanner
                    prompt={submitResult.crisis.prompt}
                    resources={submitResult.crisis.resources}
                    acknowledged={crisisAcknowledged}
                    onAcknowledgeChange={setCrisisAcknowledged}
                  />
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
                  <GuestSignupGate
                    step={guestGateStep}
                    sabbathDay={guestSabbathDay}
                    theme={guestTheme}
                    textScale={guestTextScale}
                    onStepChange={setGuestGateStep}
                    onSabbathDayChange={setGuestSabbathDay}
                    onThemeChange={setGuestTheme}
                    onTextScaleChange={setGuestTextScale}
                    onContinue={handleGuestSoftOnboardingContinue}
                    onSignUp={redirectToSignUpFromGuestGate}
                  />
                )}

                <FadeIn>
                  <section className="mb-6">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-label vw-small text-gold">
                        3 PRIMARY AI OPTIONS
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
                        .filter((option) => option.kind === 'ai_primary')
                        .map((option) => (
                          <AuditOptionCard
                            key={option.id}
                            option={option}
                            variant="large"
                            disabled={!optionSelectionReady}
                            loading={
                              submitting && selectingOptionId === option.id
                            }
                            submitting={submitting}
                            expandedReasoning={
                              expandedReasoningOptionId === option.id
                            }
                            onSelect={(id) => void submitConsentAndSelect(id)}
                            onSave={saveOptionForLater}
                            onToggleReasoning={(id) =>
                              setExpandedReasoningOptionId((current) =>
                                current === id ? null : id,
                              )
                            }
                          />
                        ))}
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
                        .map((option) => (
                          <AuditOptionCard
                            key={option.id}
                            option={option}
                            variant="small"
                            disabled={!optionSelectionReady}
                            loading={
                              submitting && selectingOptionId === option.id
                            }
                            submitting={submitting}
                            expandedReasoning={
                              expandedReasoningOptionId === option.id
                            }
                            onSelect={(id) => void submitConsentAndSelect(id)}
                            onSave={saveOptionForLater}
                            onToggleReasoning={(id) =>
                              setExpandedReasoningOptionId((current) =>
                                current === id ? null : id,
                              )
                            }
                          />
                        ))}
                    </div>
                  </section>
                </FadeIn>

                <SavedPathsList
                  savedOptions={savedOptions}
                  hasStaleOptions={hasStaleSavedOptions}
                  message={savedOptionsMessage}
                  onRemove={removeSavedOption}
                  onClean={cleanSavedOptions}
                />

                <AuditRerollSection
                  rerollsRemaining={rerollsRemaining}
                  rerollUsed={rerollUsed}
                  isRerolling={isRerolling}
                  submitting={submitting}
                  onReroll={() => void rerollOptions()}
                />
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
                        return (
                          <button
                            key={`top-day-${day.day}`}
                            type="button"
                            onClick={() => switchToDay(day.day)}
                            className="text-label vw-small border px-3 py-2"
                            style={{
                              borderColor: isSelected
                                ? 'var(--color-border-strong)'
                                : 'var(--color-border)',
                              background: isSelected
                                ? 'var(--color-active)'
                                : 'transparent',
                              opacity: day.locked ? 0.72 : 1,
                            }}
                          >
                            DAY {day.day}
                            {day.locked ? ' \u00B7 LOCKED' : ''}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                <section className="md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-8">
                  <PlanDayRail
                    railDays={railDays}
                    selectedDayNumber={selectedDayNumber}
                    daySectionAnchors={daySectionAnchors}
                    archivePlans={archiveForRail}
                    onSwitchDay={switchToDay}
                  />

                  <div className="devotional-reader-stage">
                    {loadingPlan && (
                      <p className="vw-body mb-6 text-secondary">
                        Building your day-by-day devotional path...
                      </p>
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
                        <PlanDayContent
                          day={selectedPlanDay}
                          bookmarkingDay={bookmarkingDay}
                          savedDay={savedDay}
                          onBookmark={(day) => void savePlanDayBookmark(day)}
                        />
                      </>
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
                        void fetch('/api/soul-audit/manage', {
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
