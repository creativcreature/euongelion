'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import FadeIn from '@/components/motion/FadeIn'
import PresenceWeekRow from '@/components/PresenceWeekRow'
import { loadSelectedAuditReason } from '@/components/soul-audit/helpers'

/**
 * TodayReturningBand — F-069 (returning-user "Today" home).
 *
 * Client island rendered above the daily edition on /today. Progressive
 * enhancement only: the server-rendered edition below is untouched, and
 * this band renders nothing until /api/soul-audit/current resolves — with
 * JavaScript disabled the page is exactly what it was before.
 *
 * States:
 * - Active plan   → time-of-day greeting + "DAY N · <plan title>" continue
 *   card routing to the plan's canonical reader route (from the API).
 * - No plan       → greeting + one quiet Soul Audit recommendation row.
 *   One card, not a carousel — restraint is the brand.
 * - Fetch failure → renders nothing. The edition below IS the content;
 *   a reader never sees an error for a band they never asked for.
 */

/** Time-of-day greeting in brand voice: plain, warm, no exclamation. */
export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning.'
  if (hour >= 12 && hour < 17) return 'Good afternoon.'
  return 'Good evening.'
}

type BandState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'none' }
  | {
      kind: 'plan'
      route: string
      seriesTitle: string
      dayNumber?: number
      /**
       * D-22 (F-074): the Soul Audit's real stored reason this plan was
       * matched — resolved from this session's audit payloads, or undefined.
       * Never fabricated: absent data simply renders no why-row.
       */
      whyThis?: string
    }

export default function TodayReturningBand() {
  const [state, setState] = useState<BandState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function resolveCurrent() {
      try {
        const response = await fetch('/api/soul-audit/current', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) throw new Error('Current route unavailable.')

        const payload = (await response.json()) as {
          hasCurrent?: boolean
          route?: string
          seriesTitle?: string
          dayNumber?: number
          planToken?: string
          seriesSlug?: string
        }
        if (cancelled) return

        if (!payload.hasCurrent) {
          setState({ kind: 'none' })
          return
        }

        const route = typeof payload.route === 'string' ? payload.route : ''
        const seriesTitle =
          typeof payload.seriesTitle === 'string'
            ? payload.seriesTitle.trim()
            : ''
        if (!route || route === '/' || !seriesTitle) {
          // hasCurrent without a usable route/title is a malformed payload —
          // hide the band rather than invent a destination.
          setState({ kind: 'hidden' })
          return
        }

        setState({
          kind: 'plan',
          route,
          seriesTitle,
          dayNumber:
            typeof payload.dayNumber === 'number' &&
            Number.isFinite(payload.dayNumber)
              ? payload.dayNumber
              : undefined,
          whyThis:
            loadSelectedAuditReason({
              planToken:
                typeof payload.planToken === 'string'
                  ? payload.planToken
                  : null,
              seriesSlug:
                typeof payload.seriesSlug === 'string'
                  ? payload.seriesSlug
                  : null,
            }) ?? undefined,
        })
      } catch {
        if (cancelled) return
        setState({ kind: 'hidden' })
      }
    }

    void resolveCurrent()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading' || state.kind === 'hidden') return null

  const greeting = greetingForHour(new Date().getHours())

  return (
    <section
      className="today-returning-band"
      aria-label={
        state.kind === 'plan'
          ? 'Your active devotional plan'
          : 'Begin a devotional path'
      }
      data-testid="today-returning-band"
    >
      <FadeIn className="today-returning-band-inner" y={12}>
        <p className="today-greeting" data-testid="today-greeting">
          {greeting}
        </p>

        {/* F-066 (SA-025): gentle presence — days you showed up, quietly
            lit. No counts, no streak framing; local data only. */}
        <PresenceWeekRow className="today-presence-row" />

        {state.kind === 'plan' ? (
          <Link
            href={state.route}
            className="today-continue-card"
            data-testid="today-continue-card"
            aria-label={
              typeof state.dayNumber === 'number'
                ? `Continue ${state.seriesTitle} at day ${state.dayNumber}`
                : `Continue ${state.seriesTitle}`
            }
          >
            <p className="text-label today-continue-kicker">
              {typeof state.dayNumber === 'number' && (
                <>
                  <span className="text-gold">DAY {state.dayNumber}</span>
                  <span aria-hidden="true"> · </span>
                </>
              )}
              <span>{state.seriesTitle}</span>
            </p>
            <p className="today-continue-line">Continue where you left off.</p>
            {/* D-22 (Headspace why-row): one quiet line of the audit's real
                stored reasoning — rendered only when it exists. */}
            {state.whyThis && (
              <p
                className="vw-small mt-2 text-secondary"
                data-testid="today-why-this"
              >
                <span className="text-label text-gold">WHY THIS</span>
                <span aria-hidden="true"> · </span>
                {state.whyThis}
              </p>
            )}
            <span className="text-label today-continue-cta">
              CONTINUE READING &rarr;
            </span>
          </Link>
        ) : (
          <Link
            href="/soul-audit"
            className="today-continue-card"
            data-testid="today-soul-audit-card"
          >
            <p className="text-label today-continue-kicker">
              <span className="text-gold">SOUL AUDIT</span>
            </p>
            <p className="today-continue-line">
              Name what you{'’'}re carrying — we{'’'}ll compose three paths.
            </p>
            <span className="text-label today-continue-cta">BEGIN &rarr;</span>
          </Link>
        )}
      </FadeIn>
    </section>
  )
}
