'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import FadeIn from '@/components/motion/FadeIn'
import { typographer } from '@/lib/typographer'
import type {
  CustomPlanDay,
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

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
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

export default function SoulAuditResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSelection = loadSelectionResult()

  const [submitResult, setSubmitResult] =
    useState<SoulAuditSubmitResponseV2 | null>(() => loadSubmitResult())
  const [selection, setSelection] = useState<SoulAuditSelectResponse | null>(
    () => initialSelection,
  )
  const [essentialConsent, setEssentialConsent] = useState(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false)
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false)
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

  useEffect(() => {
    const fromStorage = loadSubmitResult()
    if (!fromStorage) return
    setSubmitResult(fromStorage)
  }, [])

  useEffect(() => {
    const fromStorage = loadSelectionResult()
    if (!fromStorage) return
    setSelection(fromStorage)
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
  const selectionUnlocked = Boolean(
    essentialConsent && (!submitResult?.crisis.required || crisisAcknowledged),
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

      for (const entry of responses) {
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

  const nextDays = useMemo(() => {
    if (currentDayNumber === null) return railDays
    return railDays.filter((day) => day.day > currentDayNumber)
  }, [currentDayNumber, railDays])

  const archiveForRail = useMemo(
    () => archivePlans.filter((plan) => plan.planToken !== planToken),
    [archivePlans, planToken],
  )

  useEffect(() => {
    if (submitResult) return
    if (planToken) return
    router.push('/soul-audit')
  }, [submitResult, router, planToken])

  async function submitConsentAndSelect(optionId: string) {
    if (!submitResult) return
    setSubmitting(true)
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

      if (!consentRes.ok) {
        const payload = (await consentRes.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        if (consentRes.status === 404 || payload.code === 'RUN_NOT_FOUND') {
          setRunExpired(true)
        }
        throw new Error(payload.error || 'Consent could not be recorded.')
      }
      const consentPayload =
        (await consentRes.json()) as SoulAuditConsentResponse

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
          consentToken: consentPayload.consentToken,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      })

      const selectionPayload =
        (await selectRes.json()) as SoulAuditSelectResponse & {
          error?: string
        }
      if (!selectRes.ok || !selectionPayload.ok) {
        if (
          selectRes.status === 404 ||
          selectionPayload.error?.toLowerCase().includes('run not found')
        ) {
          setRunExpired(true)
        }
        throw new Error(
          selectionPayload.error || 'Unable to lock your devotional choice.',
        )
      }

      setSelection(selectionPayload)
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

  if (!submitResult && !planToken) {
    return (
      <div className="newspaper-home min-h-screen bg-page">
        <EuangelionShellHeader />
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="newspaper-home min-h-screen bg-page">
      <EuangelionShellHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:px-12">
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
          </header>
        </FadeIn>

        {!planToken && submitResult && (
          <>
            <FadeIn>
              <section
                className="mb-8 rounded-none border p-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="grid gap-3">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={essentialConsent}
                      onChange={(e) => setEssentialConsent(e.target.checked)}
                    />
                    <span className="vw-small">
                      I consent to essential processing so my devotional options
                      and selected plan can be created.
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
                        I acknowledge the crisis resources above and want to
                        continue to devotional options.
                      </span>
                    </label>
                  )}
                </div>

                {submitResult.crisis.required && (
                  <div className="mt-5 border-t pt-4">
                    <p className="text-label vw-small mb-3 text-gold">
                      CRISIS RESOURCES
                    </p>
                    {submitResult.crisis.resources.map((resource) => (
                      <p
                        key={resource.name}
                        className="vw-small text-secondary"
                      >
                        {resource.name}: {resource.contact}
                      </p>
                    ))}
                  </div>
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
                    {submitResult.remainingAudits} audits remaining this cycle
                  </p>
                </div>
                {!selectionUnlocked && (
                  <p className="vw-small mb-4 text-secondary">
                    Check essential consent first to unlock option selection.
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-3">
                  {submitResult.options
                    .filter((option) => option.kind === 'ai_primary')
                    .map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={submitting || !selectionUnlocked}
                        onClick={() => void submitConsentAndSelect(option.id)}
                        className={`audit-option-card group relative overflow-hidden text-left ${
                          selectionUnlocked ? 'cursor-pointer' : 'is-disabled'
                        }`}
                        aria-disabled={submitting || !selectionUnlocked}
                        style={{
                          border: '1px solid var(--color-border)',
                          padding: '1.25rem',
                        }}
                      >
                        <p className="text-label vw-small mb-2 text-gold">
                          {option.title}
                        </p>
                        <p className="vw-body mb-2">
                          {typographer(option.question)}
                        </p>
                        <p className="vw-small text-secondary">
                          {typographer(option.reasoning)}
                        </p>
                        {option.preview?.verse && (
                          <p className="vw-small mt-3 text-muted">
                            {typographer(option.preview.verse)}
                          </p>
                        )}
                        {option.preview?.paragraph && (
                          <p className="vw-small mt-1 text-secondary">
                            {typographer(option.preview.paragraph)}
                          </p>
                        )}
                        <p className="audit-option-hint text-label vw-small mt-4">
                          {selectionUnlocked
                            ? 'Click to build this path'
                            : 'Check consent to unlock'}
                        </p>
                        <span className="audit-option-underline" />
                      </button>
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
                      <button
                        key={option.id}
                        type="button"
                        disabled={submitting || !selectionUnlocked}
                        onClick={() => void submitConsentAndSelect(option.id)}
                        className={`audit-option-card group relative overflow-hidden text-left ${
                          selectionUnlocked ? 'cursor-pointer' : 'is-disabled'
                        }`}
                        aria-disabled={submitting || !selectionUnlocked}
                        style={{
                          border: '1px solid var(--color-border)',
                          padding: '1.25rem',
                        }}
                      >
                        <p className="text-label vw-small mb-2 text-gold">
                          {option.title}
                        </p>
                        <p className="vw-body mb-2">
                          {typographer(option.question)}
                        </p>
                        <p className="vw-small text-secondary">
                          Opens series overview.
                        </p>
                        {option.preview?.verse && (
                          <p className="vw-small mt-3 text-muted">
                            {typographer(option.preview.verse)}
                          </p>
                        )}
                        <p className="audit-option-hint text-label vw-small mt-4">
                          {selectionUnlocked
                            ? 'Click to open this series'
                            : 'Check consent to unlock'}
                        </p>
                        <span className="audit-option-underline" />
                      </button>
                    ))}
                </div>
              </section>
            </FadeIn>
          </>
        )}

        {planToken && (
          <section className="md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
            <aside className="mb-6 md:mb-0">
              <div
                className="border-subtle bg-surface-raised p-4 md:sticky md:top-28"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small mb-3 text-gold">NEXT DAYS</p>
                {nextDays.length === 0 ? (
                  <p className="vw-small text-muted">
                    You have reached the latest unlocked day.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {nextDays.map((day) => (
                      <div
                        key={`rail-next-day-${day.day}`}
                        className="border px-3 py-2"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <p className="text-label vw-small text-gold">
                          DAY {day.day}
                          {day.locked ? ' • LOCKED' : ''}
                        </p>
                        {day.locked ? (
                          <p className="vw-small text-secondary">
                            {typographer(day.title)}
                          </p>
                        ) : (
                          <a
                            href={`#plan-day-${day.day}`}
                            className="vw-small link-highlight text-secondary"
                          >
                            {typographer(day.title)}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="mt-5 border-t pt-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-3 text-gold">ARCHIVE</p>
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
                          <p className="text-label vw-small text-gold">PLAN</p>
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

            <div>
              {loadingPlan && (
                <p className="vw-body mb-6 text-secondary">
                  Building your day-by-day devotional path...
                </p>
              )}

              {lockedMessages.length > 0 && (
                <div className="mb-8 space-y-2">
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

              <div className="space-y-6">
                {planDays.map((day) => (
                  <article
                    key={`plan-day-${day.day}`}
                    id={`plan-day-${day.day}`}
                    style={{
                      border: '1px solid var(--color-border)',
                      padding: '1.5rem',
                    }}
                  >
                    <p className="text-label vw-small mb-2 text-gold">
                      DAY {day.day}
                      {day.chiasticPosition ? ` • ${day.chiasticPosition}` : ''}
                    </p>
                    <h2 className="vw-heading-md mb-2">
                      {typographer(day.title)}
                    </h2>
                    <p className="vw-small mb-4 text-muted">
                      {day.scriptureReference}
                    </p>
                    <p className="scripture-block vw-body mb-4 text-secondary">
                      {typographer(day.scriptureText)}
                    </p>
                    <p className="vw-body mb-4 text-secondary type-prose">
                      {typographer(day.reflection)}
                    </p>
                    <p className="text-serif-italic vw-body mb-4 text-secondary type-prose">
                      {typographer(day.prayer)}
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <p className="vw-small text-secondary">
                        <strong className="text-gold">NEXT STEP: </strong>
                        {typographer(day.nextStep)}
                      </p>
                      <p className="vw-small text-secondary">
                        <strong className="text-gold">JOURNAL: </strong>
                        {typographer(day.journalPrompt)}
                      </p>
                    </div>
                    {(day.endnotes?.length ?? 0) > 0 && (
                      <div className="mt-5 border-t pt-4">
                        <p className="text-label vw-small mb-2 text-gold">
                          ENDNOTES
                        </p>
                        {day.endnotes?.map((note) => (
                          <p
                            key={`${day.day}-endnote-${note.id}`}
                            className="vw-small text-muted"
                          >
                            [{note.id}] {note.source} — {note.note}
                          </p>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {error && (
          <div className="mt-6 text-center">
            <p className="vw-body text-secondary">{error}</p>
            {runExpired && (
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('soul-audit-submit-v2')
                  sessionStorage.removeItem('soul-audit-selection-v2')
                  void fetch('/api/soul-audit/reset', { method: 'POST' }).catch(
                    () => {},
                  )
                  router.push('/soul-audit')
                }}
                className="cta-major text-label vw-small mt-4 px-5 py-2"
              >
                Restart Soul Audit
              </button>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-center">
          <Link
            href="/my-devotional"
            className="text-label vw-small link-highlight"
          >
            My Devotional Home
          </Link>
          <Link href="/series" className="text-label vw-small link-highlight">
            Browse All Series
          </Link>
          <Link
            href="/soul-audit"
            className="text-label vw-small link-highlight"
          >
            New Soul Audit
          </Link>
        </div>
      </main>
    </div>
  )
}
