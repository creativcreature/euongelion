'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import TextHighlightTrigger from '@/components/TextHighlightTrigger'
import ScrollProgress from '@/components/ScrollProgress'
import ReaderTimeline, {
  type ReaderSectionAnchor,
} from '@/components/ReaderTimeline'
import FadeIn from '@/components/motion/FadeIn'
import DayContent from '@/components/soul-audit/DayContent'
import { typographer } from '@/lib/typographer'
import {
  isFullPlanDay,
  isPlanPreview,
  loadPlanDays,
  persistPlanDays,
  formatShortDate,
  formatCycleStart,
  onboardingLabel,
  onboardingDescription,
  type PlanDayPreview,
  type PlanDayResponse,
  type ArchivePlanSummary,
  type RailDay,
} from '@/components/soul-audit/helpers'
import type { CustomPlanDay, PlanOnboardingMeta } from '@/types/soul-audit'

export default function PlanReaderPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const planToken = typeof params.planToken === 'string' ? params.planToken : ''

  const requestedDayNumber = useMemo(() => {
    const raw = searchParams.get('day')
    if (!raw) return null
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  }, [searchParams])

  // --- State ---
  const [planDays, setPlanDays] = useState<CustomPlanDay[]>([])
  const [lockedDayPreviews, setLockedDayPreviews] = useState<PlanDayPreview[]>(
    [],
  )
  const [lockedMessages, setLockedMessages] = useState<string[]>([])
  const [archivePlans, setArchivePlans] = useState<ArchivePlanSummary[]>([])
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [planOnboardingMeta, setPlanOnboardingMeta] =
    useState<PlanOnboardingMeta | null>(null)
  const [bookmarkingDay, setBookmarkingDay] = useState<number | null>(null)
  const [savedDay, setSavedDay] = useState<number | null>(null)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  // --- Load plan data ---
  const loadPlan = useCallback(
    async (token: string) => {
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
        if (resolvedSchedule) setPlanOnboardingMeta(resolvedSchedule)
        if (resolvedPlanDays.length > 0) {
          persistPlanDays(token, resolvedPlanDays)
        }
      } catch (err) {
        const cachedPlanDays = loadPlanDays(planToken)
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
    },
    [planToken],
  )

  useEffect(() => {
    if (!planToken) return
    const cachedPlanDays = loadPlanDays(planToken)
    if (cachedPlanDays.length > 0) setPlanDays(cachedPlanDays)
    void loadPlan(planToken)
  }, [loadPlan, planToken])

  // Load archive
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

  // --- Derived values ---
  const railDays = useMemo<RailDay[]>(() => {
    const byDay = new Map<number, RailDay>()

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

  // Day selection effects
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

  // Redirect if no plan token
  useEffect(() => {
    if (!planToken) router.push('/soul-audit')
  }, [planToken, router])

  // --- Handlers ---
  function switchToDay(dayNumber: number) {
    setSelectedDayNumber(dayNumber)
    const params = new URLSearchParams(searchParams.toString())
    params.set('day', String(dayNumber))
    router.replace(`/soul-audit/plan/${planToken}?${params.toString()}`, {
      scroll: false,
    })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  async function savePlanDayBookmark(day: CustomPlanDay) {
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

  async function handleResetAudit() {
    sessionStorage.removeItem('soul-audit-result')
    sessionStorage.removeItem('soul-audit-submit-v2')
    sessionStorage.removeItem('soul-audit-selection-v2')
    try {
      await fetch('/api/soul-audit/reset', { method: 'POST' })
    } catch {
      // continue local reset
    }
    router.push('/soul-audit')
  }

  // --- Onboarding meta ---
  const onboardingKicker = onboardingLabel(planOnboardingMeta)
  const onboardingBlurb = onboardingDescription(planOnboardingMeta)
  const cycleStartLabel =
    planOnboardingMeta &&
    formatCycleStart(
      planOnboardingMeta.cycleStartAt,
      planOnboardingMeta.timezone,
    )

  if (!planToken) {
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
        <ScrollProgress showLabel />
        <EuangelionShellHeader />
        <section className="mock-panel">
          <div className="mx-auto w-full max-w-6xl shell-content-pad">
            <Breadcrumbs
              className="mb-7"
              items={[
                { label: 'HOME', href: '/' },
                { label: 'SOUL AUDIT', href: '/soul-audit' },
                { label: 'MY PLAN' },
              ]}
            />

            <FadeIn>
              <header className="mb-10 text-center">
                <p className="text-label vw-small mb-4 text-gold">SOUL AUDIT</p>
                <h1 className="vw-heading-md">
                  {typographer('Your devotional path is now active.')}
                </h1>
                {onboardingKicker && onboardingBlurb && (
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

            {/* Day strip */}
            {railDays.length > 0 && (
              <section
                className="mb-6 border p-3"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small mb-2 text-gold">DAY STRIP</p>
                <div className="flex flex-wrap gap-2">
                  {railDays.map((day) => {
                    const isSelected = day.day === selectedDayNumber
                    return (
                      <button
                        key={`top-day-${day.day}`}
                        type="button"
                        onClick={() => switchToDay(day.day)}
                        disabled={day.locked}
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

            {/* Main reader layout */}
            <section className="md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-8">
              {/* Sidebar */}
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
                          disabled={day.locked}
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
                            {day.locked ? ' \u00B7 LOCKED' : ''}
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

              {/* Day content area */}
              <div className="devotional-reader-stage">
                {loadingPlan && planDays.length === 0 && (
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
                  <DayContent
                    day={selectedPlanDay}
                    daySlug={selectedPlanDaySlug}
                    bookmarkingDay={bookmarkingDay}
                    savedDay={savedDay}
                    onBookmark={(day) => void savePlanDayBookmark(day)}
                  />
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
                      This day is visible in your timeline and will unlock on
                      schedule.
                    </p>
                  </article>
                ) : (
                  <p className="vw-body text-secondary">
                    Select a day from the timeline to continue.
                  </p>
                )}
              </div>
            </section>

            {/* Error display */}
            {error && (
              <div className="mt-6 text-center">
                <p className="vw-body text-secondary">{error}</p>
              </div>
            )}

            {/* Reset + nav */}
            <div className="mt-10 text-center">
              <button
                type="button"
                className="mock-reset-btn text-label"
                onClick={() => void handleResetAudit()}
              >
                RESET AUDIT
              </button>
            </div>
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
