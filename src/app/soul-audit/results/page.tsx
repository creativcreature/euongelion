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
import ReaderTimeline, {
  type ReaderSectionAnchor,
} from '@/components/ReaderTimeline'
import FadeIn from '@/components/motion/FadeIn'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import type {
  CrisisResource,
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

type SavedAuditOption = {
  id: string
  auditRunId: string
  kind: 'ai_primary' | 'curated_prefab'
  title: string
  question: string
  reasoning: string
  verse?: string
  paragraph?: string
  savedAt: string
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
    return parsed.version === 'v2' ? parsed : null
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
  sessionStorage.setItem(`${PLAN_CACHE_PREFIX}${token}`, JSON.stringify(days))
}

function loadPlanDays(token: string): CustomPlanDay[] {
  if (typeof window === 'undefined' || !token) return []
  const raw = sessionStorage.getItem(`${PLAN_CACHE_PREFIX}${token}`)
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
  const { lastInput } = useSoulAuditStore()

  const [submitResult, setSubmitResult] =
    useState<SoulAuditSubmitResponseV2 | null>(() => loadSubmitResult())
  const [selection, setSelection] = useState<SoulAuditSelectResponse | null>(
    () => initialSelection,
  )
  const [essentialConsent, setEssentialConsent] = useState(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false)
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false)
  const [consentToken, setConsentToken] = useState<string | null>(null)
  const [consentFingerprint, setConsentFingerprint] = useState<string | null>(
    null,
  )
  const [consentStatus, setConsentStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const [showRerollConfirm, setShowRerollConfirm] = useState(false)
  const [rerollConfirmValue, setRerollConfirmValue] = useState('')
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    setRerollUsed(
      window.sessionStorage.getItem(REROLL_USED_SESSION_KEY) === 'true',
    )
    setSavedOptions(loadSavedAuditOptions())
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
  const currentConsentFingerprint = useMemo(() => {
    if (!submitResult) return null
    return [
      submitResult.auditRunId,
      essentialConsent ? '1' : '0',
      analyticsOptIn ? '1' : '0',
      crisisAcknowledged ? '1' : '0',
    ].join(':')
  }, [submitResult, essentialConsent, analyticsOptIn, crisisAcknowledged])
  const consentRequirementsMet = Boolean(
    essentialConsent && (!submitResult?.crisis.required || crisisAcknowledged),
  )
  const selectionUnlocked = Boolean(
    consentToken &&
    consentFingerprint &&
    currentConsentFingerprint &&
    consentFingerprint === currentConsentFingerprint,
  )

  useEffect(() => {
    if (!consentFingerprint || !currentConsentFingerprint) return
    if (consentFingerprint === currentConsentFingerprint) return
    setConsentToken(null)
    setConsentStatus('idle')
  }, [consentFingerprint, currentConsentFingerprint])

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

  async function recordConsent(): Promise<string | null> {
    if (!submitResult || !currentConsentFingerprint) return null
    if (!consentRequirementsMet) {
      setError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before continuing.'
          : 'Essential consent is required before continuing.',
      )
      setConsentStatus('error')
      return null
    }

    setConsentStatus('saving')
    setError(null)
    setRunExpired(false)

    try {
      const consentRes = await fetch('/api/soul-audit/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditRunId: submitResult.auditRunId,
          runToken: submitResult.runToken,
          essentialAccepted: essentialConsent,
          analyticsOptIn,
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
        setConsentStatus('error')
        throw new Error(payload.error || 'Consent could not be recorded.')
      }

      const consentPayload = payload as SoulAuditConsentResponse
      setConsentToken(consentPayload.consentToken)
      setConsentFingerprint(currentConsentFingerprint)
      setConsentStatus('saved')
      return consentPayload.consentToken
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Consent could not be recorded.',
      )
      return null
    }
  }

  async function submitConsentAndSelect(optionId: string) {
    if (!submitResult) return
    if (!selectionUnlocked && !consentRequirementsMet) {
      setError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before choosing a devotional path.'
          : 'Essential consent is required before choosing a devotional path.',
      )
      return
    }

    setSubmitting(true)
    setError(null)
    setRunExpired(false)

    try {
      let resolvedConsentToken = selectionUnlocked ? consentToken : null
      if (!resolvedConsentToken) {
        resolvedConsentToken = await recordConsent()
      }
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
        if (
          selectionPayload.code === 'ESSENTIAL_CONSENT_REQUIRED' ||
          selectionPayload.code === 'CRISIS_ACK_REQUIRED'
        ) {
          setConsentToken(null)
          setConsentFingerprint(null)
          setConsentStatus('error')
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
        router.push(
          `/soul-audit/results?planToken=${selectionPayload.planToken}`,
        )
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete selection.',
      )
    } finally {
      setSubmitting(false)
    }
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
      setEssentialConsent(false)
      setAnalyticsOptIn(false)
      setCrisisAcknowledged(false)
      setConsentToken(null)
      setConsentFingerprint(null)
      setConsentStatus('idle')
      setExpandedReasoningOptionId(null)
      setShowRerollConfirm(false)
      setRerollConfirmValue('')
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
      setEssentialConsent(false)
      setAnalyticsOptIn(false)
      setCrisisAcknowledged(false)
      setConsentToken(null)
      setConsentFingerprint(null)
      setConsentStatus('idle')
      setExpandedReasoningOptionId(null)
      setShowRerollConfirm(false)
      setRerollConfirmValue('')
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
    kind: 'ai_primary' | 'curated_prefab'
    title: string
    question: string
    reasoning: string
    preview?: { verse: string; paragraph: string } | null
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
                {!planToken && submitResult?.inputGuidance && (
                  <p className="vw-small mt-3 text-muted">
                    {submitResult.inputGuidance}
                  </p>
                )}
                {(planToken || submitResult) && (
                  <div className="mt-4">
                    <button
                      type="button"
                      className="mock-reset-btn text-label"
                      onClick={() => void handleResetAudit()}
                    >
                      RESET AUDIT
                    </button>
                  </div>
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
                    {savedOptions.length === 0 ? (
                      <p className="vw-small mt-2 text-muted">
                        Save options you may want to revisit later.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {savedOptions.slice(0, 6).map((saved) => (
                          <div
                            key={`saved-option-${saved.id}`}
                            className="border px-3 py-2"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              {saved.verse && (
                                <p className="audit-option-verse vw-small w-full">
                                  {typographer(saved.verse)}
                                </p>
                              )}
                              <p className="text-label vw-small text-gold">
                                {saved.title}
                              </p>
                              <button
                                type="button"
                                className="text-label vw-small link-highlight"
                                onClick={() => removeSavedOption(saved.id)}
                              >
                                Remove
                              </button>
                            </div>
                            <p className="vw-small mt-1 text-secondary">
                              {typographer(saved.question)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {savedOptionsMessage && (
                      <p className="vw-small mt-2 text-muted">
                        {savedOptionsMessage}
                      </p>
                    )}
                  </section>
                </FadeIn>

                <FadeIn>
                  <section
                    className="mb-8 rounded-none border p-6"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {submitResult.crisis.required && (
                      <div
                        className="mb-5 border-b pb-4"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
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
                      </div>
                    )}

                    <div className="grid gap-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={essentialConsent}
                          onChange={(e) =>
                            setEssentialConsent(e.target.checked)
                          }
                        />
                        <span className="vw-small">
                          I consent to essential processing so my devotional
                          options and selected plan can be created.
                        </span>
                      </label>

                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={analyticsOptIn}
                          onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                        />
                        <span className="vw-small">
                          Optional: allow anonymous analytics (default is off).
                        </span>
                      </label>

                      {submitResult.crisis.required && (
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
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="cta-major text-label vw-small px-4 py-2 disabled:opacity-50"
                        onClick={() => void recordConsent()}
                        disabled={
                          consentStatus === 'saving' || !consentRequirementsMet
                        }
                      >
                        {consentStatus === 'saving'
                          ? 'Recording Consent...'
                          : selectionUnlocked
                            ? 'Consent Recorded'
                            : 'Record Consent'}
                      </button>
                      <p className="vw-small text-secondary">
                        {selectionUnlocked
                          ? 'Consent saved. You can now select a devotional path.'
                          : submitResult.crisis.required && !crisisAcknowledged
                            ? 'Acknowledge crisis support before recording consent.'
                            : essentialConsent
                              ? 'Record consent to unlock option selection.'
                              : 'Check essential consent to continue.'}
                      </p>
                    </div>
                  </section>
                </FadeIn>

                <FadeIn>
                  <section
                    className="mb-7 border p-4"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <p className="text-label vw-small mb-2 text-gold">
                      OPTION CONTROLS
                    </p>
                    <p className="vw-small text-secondary">
                      You can reroll once. Rerolling discards the current 5
                      options permanently.
                    </p>
                    {!rerollUsed ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!showRerollConfirm ? (
                          <button
                            type="button"
                            className="text-label vw-small link-highlight"
                            onClick={() => setShowRerollConfirm(true)}
                            disabled={isRerolling || submitting}
                          >
                            Reroll Options (1x)
                          </button>
                        ) : (
                          <>
                            <input
                              value={rerollConfirmValue}
                              onChange={(event) =>
                                setRerollConfirmValue(event.target.value)
                              }
                              placeholder="Type REROLL"
                              className="bg-surface-raised px-3 py-2 vw-small"
                              style={{
                                border: '1px solid var(--color-border)',
                              }}
                              disabled={isRerolling}
                            />
                            <button
                              type="button"
                              className="cta-major text-label vw-small px-4 py-2 disabled:opacity-50"
                              disabled={
                                isRerolling ||
                                rerollConfirmValue.trim().toUpperCase() !==
                                  'REROLL'
                              }
                              onClick={() => void rerollOptions()}
                            >
                              {isRerolling ? 'Rerolling...' : 'Confirm Reroll'}
                            </button>
                            <button
                              type="button"
                              className="text-label vw-small link-highlight"
                              onClick={() => {
                                setShowRerollConfirm(false)
                                setRerollConfirmValue('')
                              }}
                              disabled={isRerolling}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="vw-small mt-2 text-muted">
                        Reroll already used for this audit run.
                      </p>
                    )}
                  </section>
                </FadeIn>

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
                    {!selectionUnlocked && (
                      <p className="vw-small mb-4 text-secondary">
                        {submitResult.crisis.required && !crisisAcknowledged
                          ? 'Acknowledge crisis support, then record consent to unlock option selection.'
                          : essentialConsent
                            ? 'Record consent to unlock option selection.'
                            : 'Check essential consent, then record consent to unlock option selection.'}
                      </p>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                      {submitResult.options
                        .filter((option) => option.kind === 'ai_primary')
                        .map((option) => (
                          <article
                            key={option.id}
                            className="audit-option-card group relative overflow-hidden text-left"
                            style={{
                              border: '1px solid var(--color-border)',
                              padding: '1.25rem',
                            }}
                          >
                            <button
                              type="button"
                              disabled={submitting || !selectionUnlocked}
                              onClick={() =>
                                void submitConsentAndSelect(option.id)
                              }
                              className={`w-full text-left ${
                                selectionUnlocked
                                  ? 'cursor-pointer'
                                  : 'is-disabled'
                              }`}
                              aria-disabled={submitting || !selectionUnlocked}
                            >
                              {option.preview?.verse && (
                                <p className="audit-option-verse vw-small mb-2">
                                  {typographer(option.preview.verse)}
                                </p>
                              )}
                              <p className="text-label vw-small mb-2 text-gold">
                                {option.title}
                              </p>
                              <p className="vw-body mb-2">
                                {typographer(option.question)}
                              </p>
                              {option.preview?.paragraph && (
                                <p className="vw-small mt-1 text-secondary">
                                  {typographer(option.preview.paragraph)}
                                </p>
                              )}
                              <p className="audit-option-hint text-label vw-small mt-4">
                                {selectionUnlocked
                                  ? 'Click to build this path'
                                  : 'Record consent to unlock'}
                              </p>
                            </button>
                            <div
                              className="mt-3 border-t pt-3"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <button
                                type="button"
                                className="text-label vw-small link-highlight mr-4"
                                onClick={() => saveOptionForLater(option)}
                              >
                                Save for later
                              </button>
                              <button
                                type="button"
                                className="text-label vw-small link-highlight"
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
                                <p className="vw-small mt-2 text-secondary">
                                  {typographer(option.reasoning)}
                                </p>
                              )}
                            </div>
                            <span className="audit-option-underline" />
                          </article>
                        ))}
                    </div>
                  </section>
                </FadeIn>

                <FadeIn>
                  <section>
                    <p className="text-label vw-small mb-4 text-gold">
                      2 CURATED PREFAB OPTIONS
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {submitResult.options
                        .filter((option) => option.kind === 'curated_prefab')
                        .map((option) => (
                          <article
                            key={option.id}
                            className="audit-option-card group relative overflow-hidden text-left"
                            style={{
                              border: '1px solid var(--color-border)',
                              padding: '1.25rem',
                            }}
                          >
                            <button
                              type="button"
                              disabled={submitting || !selectionUnlocked}
                              onClick={() =>
                                void submitConsentAndSelect(option.id)
                              }
                              className={`w-full text-left ${
                                selectionUnlocked
                                  ? 'cursor-pointer'
                                  : 'is-disabled'
                              }`}
                              aria-disabled={submitting || !selectionUnlocked}
                            >
                              {option.preview?.verse && (
                                <p className="audit-option-verse vw-small mb-2">
                                  {typographer(option.preview.verse)}
                                </p>
                              )}
                              <p className="text-label vw-small mb-2 text-gold">
                                {option.title}
                              </p>
                              <p className="vw-body mb-2">
                                {typographer(option.question)}
                              </p>
                              <p className="vw-small text-secondary">
                                Opens series overview.
                              </p>
                              <p className="audit-option-hint text-label vw-small mt-4">
                                {selectionUnlocked
                                  ? 'Click to open this series'
                                  : 'Record consent to unlock'}
                              </p>
                            </button>
                            <div
                              className="mt-3 border-t pt-3"
                              style={{ borderColor: 'var(--color-border)' }}
                            >
                              <button
                                type="button"
                                className="text-label vw-small link-highlight mr-4"
                                onClick={() => saveOptionForLater(option)}
                              >
                                Save for later
                              </button>
                              <button
                                type="button"
                                className="text-label vw-small link-highlight"
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
                                <p className="vw-small mt-2 text-secondary">
                                  {typographer(option.reasoning)}
                                </p>
                              )}
                            </div>
                            <span className="audit-option-underline" />
                          </article>
                        ))}
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
                            {day.locked ? ' · LOCKED' : ''}
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
                          return (
                            <button
                              key={`rail-day-${day.day}`}
                              type="button"
                              className="border px-3 py-2 text-left"
                              style={{
                                borderColor: isSelected
                                  ? 'var(--color-border-strong)'
                                  : 'var(--color-border)',
                                background: isSelected
                                  ? 'var(--color-active)'
                                  : 'transparent',
                                opacity: day.locked ? 0.72 : 1,
                              }}
                              onClick={() => switchToDay(day.day)}
                            >
                              <p className="text-label vw-small text-gold">
                                DAY {day.day}
                                {day.locked ? ' · LOCKED' : ''}
                              </p>
                              <p className="vw-small text-secondary">
                                {typographer(day.title)}
                              </p>
                              {day.scriptureReference && (
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
                        <article
                          key={`plan-day-${selectedPlanDay.day}`}
                          style={{
                            border: '1px solid var(--color-border)',
                            padding: '1.5rem',
                          }}
                        >
                          <p className="text-label vw-small mb-2 text-gold">
                            DAY {selectedPlanDay.day}
                          </p>
                          <h2 className="vw-heading-md mb-2">
                            {typographer(selectedPlanDay.title)}
                          </h2>
                          <p className="vw-small mb-4 text-muted">
                            {selectedPlanDay.scriptureReference}
                          </p>
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
                          <div
                            id={`day-${selectedPlanDay.day}-practice`}
                            className="grid gap-4 md:grid-cols-2"
                          >
                            <p className="vw-small text-secondary">
                              <strong className="text-gold">NEXT STEP: </strong>
                              {typographer(selectedPlanDay.nextStep)}
                            </p>
                            <p
                              id={`day-${selectedPlanDay.day}-journal`}
                              className="vw-small text-secondary"
                            >
                              <strong className="text-gold">JOURNAL: </strong>
                              {typographer(selectedPlanDay.journalPrompt)}
                            </p>
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
