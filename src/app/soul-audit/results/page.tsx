'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import CrisisGate from '@/components/soul-audit/CrisisGate'
import GenerationProgress from '@/components/soul-audit/GenerationProgress'
import OptionCard from '@/components/soul-audit/OptionCard'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  SITE_CONSENT_UPDATED_EVENT,
  readSiteConsentFromDocument,
  type SiteConsent,
} from '@/lib/site-consent'
import { typographer } from '@/lib/typographer'
import {
  loadSubmitResult,
  loadLastAuditInput,
  loadSavedAuditOptions,
  persistPlanDays,
  persistSavedAuditOptions,
  resolveVerseSnippet,
  sanitizeLegacyDisplayText,
  LAST_AUDIT_INPUT_SESSION_KEY,
  REROLL_USED_SESSION_KEY,
  type SavedAuditOption,
} from '@/components/soul-audit/helpers'
import type {
  AuditOptionPreview,
  SoulAuditSelectResponse,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

export default function SoulAuditResultsPage() {
  const router = useRouter()
  const { lastInput } = useSoulAuditStore()
  const devotionalDepthPreference = useSettingsStore(
    (state) => state.devotionalDepthPreference,
  )

  // --- Core state ---
  const [submitResult, setSubmitResult] =
    useState<SoulAuditSubmitResponseV2 | null>(() => loadSubmitResult())
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectingOptionId, setSelectingOptionId] = useState<string | null>(
    null,
  )
  // When a NEW plan is being generated, the select endpoint returns a job to
  // poll (not a route). We hand off to GenerationProgress until it completes.
  const [generationJob, setGenerationJob] = useState<{
    jobId: string
    pollUrl: string
    optionId: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectionInlineError, setSelectionInlineError] = useState<
    string | null
  >(null)
  const [runExpired, setRunExpired] = useState(false)
  const [expandedReasoningOptionId, setExpandedReasoningOptionId] = useState<
    string | null
  >(null)

  // --- Guided reveal state ---
  // Start showing ONLY the recommended path (index 0) with its reasoning
  // expanded. Each tap of "Explore another direction" reveals one more
  // alternative (Calm/Yazio-style guided reveal — the reveal is a room,
  // not a list).
  const [revealedCount, setRevealedCount] = useState(1)

  // --- Reroll state ---
  const [rerollUsed, setRerollUsed] = useState(false)
  const [isRerolling, setIsRerolling] = useState(false)
  const [lastAuditInput, setLastAuditInput] = useState<string | null>(() =>
    loadLastAuditInput(),
  )

  // --- Saved options ---
  const [savedOptions, setSavedOptions] = useState<SavedAuditOption[]>([])
  const [savedOptionsMessage, setSavedOptionsMessage] = useState<string | null>(
    null,
  )

  // --- Site consent (for analytics opt-in) ---
  const [siteConsent, setSiteConsent] = useState<SiteConsent | null>(null)

  // --- Active plan / pastoral nudge ---
  const [activePlanRoute, setActivePlanRoute] = useState<string | null>(null)
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false)
  const [pendingSelectOptionId, setPendingSelectOptionId] = useState<
    string | null
  >(null)
  const switchConfirmedRef = useRef(false)

  // --- Init effects ---
  useEffect(() => {
    if (typeof window === 'undefined') return
    setRerollUsed(
      window.sessionStorage.getItem(REROLL_USED_SESSION_KEY) === 'true',
    )
    setSavedOptions(loadSavedAuditOptions())
  }, [])

  useEffect(() => {
    const fromStorage = loadSubmitResult()
    if (fromStorage) setSubmitResult(fromStorage)
  }, [])

  useEffect(() => {
    if (!lastInput) return
    setLastAuditInput(lastInput)
    window.sessionStorage.setItem(LAST_AUDIT_INPUT_SESSION_KEY, lastInput)
  }, [lastInput])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setSiteConsent(readSiteConsentFromDocument())
    sync()
    window.addEventListener(SITE_CONSENT_UPDATED_EVENT, sync)
    return () => window.removeEventListener(SITE_CONSENT_UPDATED_EVENT, sync)
  }, [])

  // Check for active plan (pastoral nudge before mid-week switching)
  useEffect(() => {
    let cancelled = false
    fetch('/api/soul-audit/current')
      .then((res) => res.json())
      .then((data: { hasCurrent?: boolean; route?: string }) => {
        if (cancelled) return
        if (data.hasCurrent && data.route) {
          setActivePlanRoute(data.route)
        }
      })
      .catch(() => {
        // no-op — proceed without active plan check
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Redirect to /soul-audit if there's no submit result
  useEffect(() => {
    if (!submitResult) router.push('/soul-audit')
  }, [submitResult, router])

  // --- Derived values ---
  const crisisRequirementsMet = Boolean(
    !submitResult?.crisis.required || crisisAcknowledged,
  )
  const optionSelectionReady = Boolean(!submitting && crisisRequirementsMet)

  const displayOptions = useMemo(() => {
    if (!submitResult) return []
    // Matched keywords ride in the submit payload's option evidence (keyed by
    // optionId) — real matches between the reflection and each direction, used
    // by OptionCard as keyword chips. Never fabricated client-side.
    const matchedKeywordsByOptionId = new Map(
      (submitResult.diagnostics?.optionEvidence ?? []).map((evidence) => [
        evidence.optionId,
        evidence.matchedKeywords,
      ]),
    )
    return submitResult.options.map((option) => ({
      ...option,
      title: sanitizeLegacyDisplayText(option.title),
      question: sanitizeLegacyDisplayText(option.question),
      reasoning: sanitizeLegacyDisplayText(option.reasoning),
      matchedKeywords: matchedKeywordsByOptionId.get(option.id) ?? [],
      preview: option.preview
        ? {
            ...option.preview,
            paragraph: sanitizeLegacyDisplayText(option.preview.paragraph),
          }
        : option.preview,
    }))
  }, [submitResult])

  const hasStaleSavedOptions = savedOptions.some(
    (entry) =>
      Date.now() - new Date(entry.savedAt).getTime() > 30 * 24 * 60 * 60 * 1000,
  )

  // --- Handlers ---
  function confirmSwitch() {
    switchConfirmedRef.current = true
    setShowSwitchConfirm(false)
    if (pendingSelectOptionId) {
      void handleSelect(pendingSelectOptionId)
    }
  }

  function cancelSwitch() {
    setShowSwitchConfirm(false)
    setPendingSelectOptionId(null)
  }

  async function handleSelect(optionId: string) {
    if (!submitResult) return

    // Pastoral nudge: if user has an active plan, confirm before switching
    if (activePlanRoute && !switchConfirmedRef.current) {
      setPendingSelectOptionId(optionId)
      setShowSwitchConfirm(true)
      return
    }

    if (!crisisRequirementsMet) {
      setSelectionInlineError(
        submitResult.crisis.required && !crisisAcknowledged
          ? 'Acknowledge crisis resources before choosing a devotional path.'
          : 'Option selection is currently unavailable.',
      )
      return
    }

    setSelectionInlineError(null)
    setSelectingOptionId(optionId)
    setSubmitting(true)
    setError(null)
    setRunExpired(false)

    try {
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
          essentialAccepted: true,
          analyticsOptIn: Boolean(siteConsent?.analyticsOptIn),
          crisisAcknowledged,
          devotionalDepthPreference,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      })

      const payload = (await selectRes.json()) as SoulAuditSelectResponse & {
        error?: string
        code?: string
      }
      if (!selectRes.ok || !payload.ok) {
        if (
          selectRes.status === 404 ||
          payload.error?.toLowerCase().includes('run not found')
        ) {
          const recovered = await recoverExpiredRun({ silent: true })
          if (!recovered) {
            setRunExpired(true)
          } else {
            throw new Error(
              'These options expired — fresh ones were loaded. Choose your path again.',
            )
          }
        }
        throw new Error(
          payload.error || 'Unable to lock your devotional choice.',
        )
      }

      sessionStorage.setItem('soul-audit-selection-v2', JSON.stringify(payload))
      if (payload.planToken && Array.isArray(payload.planDays)) {
        persistPlanDays(payload.planToken, payload.planDays)
      }

      if (payload.route) {
        // Plan already exists (idempotent/complete) — go straight there.
        router.push(payload.route)
      } else if (payload.jobId && payload.pollUrl) {
        // New plan is generating — hand off to the live progress UI, which
        // polls the job and navigates to the plan when it's ready.
        setGenerationJob({
          jobId: payload.jobId,
          pollUrl: payload.pollUrl,
          optionId,
        })
      } else {
        throw new Error(
          'We started building your plan but lost track of it. Please try selecting again.',
        )
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
      setCrisisAcknowledged(false)
      setExpandedReasoningOptionId(null)
      setRerollUsed(true)
      setRevealedCount(1)

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
    if (
      !lastAuditInput ||
      !submitResult?.auditRunId ||
      !submitResult.runToken
    ) {
      if (!silent) {
        setError(
          'Run expired and no previous response was found in this browser session. Please restart Soul Audit.',
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
      setRunExpired(false)
      setCrisisAcknowledged(false)
      setExpandedReasoningOptionId(null)
      setRerollUsed(false)
      setRevealedCount(1)
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
      if (!silent) setSubmitting(false)
    }
  }

  const saveOptionForLater = useCallback(
    (option: AuditOptionPreview) => {
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
    },
    [submitResult],
  )

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

  // --- Loading / empty state ---
  if (!submitResult) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader />
          <section className="mock-panel">
            <div className="flex min-h-[40vh] items-center justify-center">
              <p className="text-muted" role="status" aria-live="polite">
                Loading...
              </p>
            </div>
          </section>
          <SiteFooter />
        </main>
      </div>
    )
  }

  // A new plan is being generated — show the live progress UI (it polls the
  // job and navigates to the plan on completion).
  if (generationJob) {
    return (
      <div className="mock-home">
        <main id="main-content" className="mock-paper">
          <EuangelionShellHeader />
          <section className="mock-panel">
            <GenerationProgress
              jobId={generationJob.jobId}
              pollUrl={generationJob.pollUrl}
              onRestart={() => {
                const optionId = generationJob.optionId
                setGenerationJob(null)
                void handleSelect(optionId)
              }}
            />
          </section>
          <SiteFooter />
        </main>
      </div>
    )
  }

  // Filter to AI primary directions only
  const directions = displayOptions.filter(
    (option) => option.kind === 'ai_primary',
  )
  const recommended = directions[0]
  const alternatives = directions.slice(1)
  const hasMoreToReveal = revealedCount < directions.length

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="mx-auto w-full max-w-3xl shell-content-pad">
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
                  {typographer('We found something for you.')}
                </h1>
                <p className="vw-small mt-3 text-secondary">
                  {revealedCount === 1
                    ? 'This is the direction that best matches your reflection. It’s a starting point, not a prescription.'
                    : 'Based on what you shared, here are a few directions. Choose where to begin — it’s a starting point, not a prescription.'}
                </p>
                <p className="vw-small mt-2 text-muted">
                  When you choose, we write your seven-day edition fresh —
                  grounded in real Scripture and the historic voices. It takes
                  about a minute; we’ll set it before your eyes.
                </p>
              </header>
            </FadeIn>

            {/* Crisis gate */}
            <FadeIn>
              <CrisisGate
                crisis={submitResult.crisis}
                acknowledged={crisisAcknowledged}
                onToggle={setCrisisAcknowledged}
              />
            </FadeIn>

            {/* Pastoral nudge: active plan warning */}
            {showSwitchConfirm && activePlanRoute && (
              <FadeIn>
                <div
                  className="mb-8 border p-5"
                  role="alertdialog"
                  aria-labelledby="audit-active-plan-label"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p
                    id="audit-active-plan-label"
                    className="text-label vw-small mb-3 text-gold"
                  >
                    ACTIVE PLAN
                  </p>
                  <p className="vw-body mb-4 text-secondary">
                    {typographer(
                      'You have a devotional path in progress. Starting a new path now will create a separate plan.',
                    )}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="cta-major text-label vw-small px-4 py-2"
                      onClick={confirmSwitch}
                    >
                      Continue with new path
                    </button>
                    <Link
                      href={activePlanRoute}
                      className="text-label vw-small link-highlight px-4 py-2"
                    >
                      Return to my plan
                    </Link>
                    <button
                      type="button"
                      className="text-label vw-small link-highlight"
                      onClick={cancelSwitch}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </FadeIn>
            )}

            {selectionInlineError && (
              <FadeIn>
                <div className="soul-audit-selection-error mb-6" role="alert">
                  <p className="vw-small text-secondary">
                    {typographer(selectionInlineError)}
                  </p>
                </div>
              </FadeIn>
            )}

            {!optionSelectionReady && (
              <p className="vw-small mb-4 text-secondary">
                {submitResult.crisis.required && !crisisAcknowledged
                  ? 'Acknowledge crisis resources to unlock option selection.'
                  : 'Option selection is currently unavailable.'}
              </p>
            )}

            {/* Recommended path (always visible) */}
            {recommended && (
              <FadeIn>
                <section
                  className="mb-8"
                  aria-labelledby="audit-recommended-label"
                >
                  <p
                    id="audit-recommended-label"
                    className="text-label vw-small mb-3 text-gold"
                  >
                    RECOMMENDED
                  </p>
                  <OptionCard
                    option={recommended}
                    isSelecting={
                      submitting && selectingOptionId === recommended.id
                    }
                    disabled={!optionSelectionReady}
                    expandedReasoning={
                      expandedReasoningOptionId === recommended.id ||
                      revealedCount === 1
                    }
                    onSelect={(id) => void handleSelect(id)}
                    onSave={saveOptionForLater}
                    onToggleReasoning={(id) =>
                      setExpandedReasoningOptionId((current) =>
                        current === id ? null : id,
                      )
                    }
                  />
                </section>
              </FadeIn>
            )}

            {/* Alternative paths (revealed progressively, one per tap) */}
            {alternatives.slice(0, revealedCount - 1).map((option, index) => (
              <FadeIn key={option.id}>
                <section
                  className="mb-8"
                  aria-labelledby={`audit-alternative-label-${option.id}`}
                >
                  <p
                    id={`audit-alternative-label-${option.id}`}
                    className="text-label vw-small mb-3 text-gold"
                  >
                    {index === 0 ? 'ALTERNATIVE' : 'ANOTHER DIRECTION'}
                  </p>
                  <OptionCard
                    option={option}
                    isSelecting={submitting && selectingOptionId === option.id}
                    disabled={!optionSelectionReady}
                    expandedReasoning={expandedReasoningOptionId === option.id}
                    onSelect={(id) => void handleSelect(id)}
                    onSave={saveOptionForLater}
                    onToggleReasoning={(id) =>
                      setExpandedReasoningOptionId((current) =>
                        current === id ? null : id,
                      )
                    }
                  />
                </section>
              </FadeIn>
            ))}

            {/* "Explore another direction" — sits below the revealed paths so
                each newly revealed alternative appears above it */}
            {hasMoreToReveal && (
              <FadeIn>
                <div className="mb-8 text-center">
                  <button
                    type="button"
                    className="text-label vw-small link-highlight border border-[var(--color-border)] px-6 py-3"
                    onClick={() =>
                      setRevealedCount((count) =>
                        Math.min(count + 1, directions.length),
                      )
                    }
                  >
                    Explore another direction
                  </button>
                </div>
              </FadeIn>
            )}

            {/* Saved paths */}
            {savedOptions.length > 0 && (
              <FadeIn>
                <section
                  className="mb-7 border p-4"
                  aria-labelledby="audit-saved-paths-label"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      id="audit-saved-paths-label"
                      className="text-label vw-small text-gold"
                    >
                      SAVED PATHS
                    </p>
                    {hasStaleSavedOptions && (
                      <button
                        type="button"
                        className="text-label vw-small link-highlight"
                        onClick={cleanSavedOptions}
                      >
                        Clear old paths
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
                              aria-label={`Remove saved path: ${saved.title}`}
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
                  <p
                    className="vw-small mt-2 text-muted"
                    role="status"
                    aria-live="polite"
                  >
                    {savedOptionsMessage}
                  </p>
                </section>
              </FadeIn>
            )}

            {/* Reroll */}
            <FadeIn>
              <section
                className="mb-7 border p-4"
                aria-labelledby="audit-reroll-label"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    id="audit-reroll-label"
                    className="text-label vw-small text-gold"
                  >
                    NOT QUITE RIGHT?
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="cta-major text-label vw-small px-4 py-2 disabled:opacity-50"
                    onClick={() => void rerollOptions()}
                    disabled={rerollUsed || isRerolling || submitting}
                  >
                    {isRerolling
                      ? 'Finding new readings…'
                      : rerollUsed
                        ? 'Already refreshed'
                        : 'Show me different readings'}
                  </button>
                  <p className="vw-small text-secondary">
                    {rerollUsed
                      ? 'These are your refreshed readings.'
                      : 'You can refresh these once.'}
                  </p>
                </div>
              </section>
            </FadeIn>

            {/* Errors */}
            {error && (
              <div className="mt-6 text-center" role="alert">
                <p className="vw-body text-secondary">{error}</p>
                {runExpired && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void recoverExpiredRun()}
                      disabled={
                        submitting ||
                        !lastAuditInput ||
                        !submitResult.auditRunId ||
                        !submitResult.runToken
                      }
                      className="cta-major text-label vw-small px-5 py-2 disabled:opacity-50"
                    >
                      {submitting ? 'Refreshing…' : 'Refresh options'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetAudit()}
                      className="text-label vw-small link-highlight"
                    >
                      Restart Soul Audit
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Remaining audits info */}
            <div className="mt-6 text-center">
              <p className="vw-small text-muted">
                {submitResult.remainingAudits} audits remaining this cycle
              </p>
            </div>

            {/* Reset + nav */}
            <div className="mt-6 text-center">
              <button
                type="button"
                className="mock-reset-btn text-label"
                onClick={() => void handleResetAudit()}
              >
                RESET AUDIT
              </button>
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
