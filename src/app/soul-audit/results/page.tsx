'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import FadeIn from '@/components/motion/FadeIn'
import { typographer } from '@/lib/typographer'
import type {
  CustomPlanDay,
  SoulAuditSelectResponse,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

type PlanDayResponse = {
  locked: boolean
  archived: boolean
  onboarding: boolean
  message?: string
  day?: CustomPlanDay
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

export default function SoulAuditResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [submitResult, setSubmitResult] =
    useState<SoulAuditSubmitResponseV2 | null>(() => loadSubmitResult())
  const [selection, setSelection] = useState<SoulAuditSelectResponse | null>(
    () => loadSelectionResult(),
  )
  const [essentialConsent, setEssentialConsent] = useState(false)
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false)
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runExpired, setRunExpired] = useState(false)
  const [planDays, setPlanDays] = useState<CustomPlanDay[]>([])
  const [lockedMessages, setLockedMessages] = useState<string[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)

  useEffect(() => {
    const fromStorage = loadSubmitResult()
    if (!fromStorage) return
    setSubmitResult(fromStorage)
  }, [])

  const planToken = useMemo(() => {
    return searchParams.get('planToken') || selection?.planToken || null
  }, [searchParams, selection?.planToken])

  const loadPlan = useCallback(async (token: string) => {
    setLoadingPlan(true)
    setError(null)

    try {
      const requests = [1, 2, 3, 4, 5].map(async (day) => {
        const response = await fetch(`/api/devotional-plan/${token}/day/${day}`)
        const payload = (await response.json()) as PlanDayResponse
        return { day, status: response.status, payload }
      })

      const responses = await Promise.all(requests)
      const unlockedDays: CustomPlanDay[] = []
      const locks: string[] = []

      for (const entry of responses) {
        if (entry.status === 200 && entry.payload.day) {
          unlockedDays.push(entry.payload.day)
        }
        if (entry.status === 423 && entry.payload.message) {
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
          if (onboardingPayload.day) unlockedDays.push(onboardingPayload.day)
        }
      }

      unlockedDays.sort((a, b) => a.day - b.day)
      setPlanDays(unlockedDays)
      setLockedMessages(locks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load plan.')
    } finally {
      setLoadingPlan(false)
    }
  }, [])

  useEffect(() => {
    if (!planToken) return
    void loadPlan(planToken)
  }, [loadPlan, planToken])

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
      <div className="newspaper-home flex min-h-screen items-center justify-center bg-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="newspaper-home min-h-screen bg-page">
      <Navigation />
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
                <div className="grid gap-4 md:grid-cols-3">
                  {submitResult.options
                    .filter((option) => option.kind === 'ai_primary')
                    .map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => void submitConsentAndSelect(option.id)}
                        className="audit-option-card group relative cursor-pointer overflow-hidden text-left"
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
                        <p className="audit-option-hint text-label vw-small mt-4">
                          Click to build this path
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
                        disabled={submitting}
                        onClick={() => void submitConsentAndSelect(option.id)}
                        className="audit-option-card group relative cursor-pointer overflow-hidden text-left"
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
                        <p className="audit-option-hint text-label vw-small mt-4">
                          Click to open this series
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
          <section>
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
                  router.push('/soul-audit')
                }}
                className="cta-major text-label vw-small mt-4 px-5 py-2"
              >
                Restart Soul Audit
              </button>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/series" className="text-label vw-small link-highlight">
            Browse All Series
          </Link>
        </div>
      </main>
    </div>
  )
}
