'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import Breadcrumbs from '@/components/Breadcrumbs'

type UsagePayload = {
  ok?: boolean
  summary?: {
    totalMessages: number
    totalCostUsd: number
    quota: {
      freeCap: number
      subscriptionCredit: number
      used: number
      state: 'active' | 'near_limit' | 'halted_platform' | 'byo_required'
    }
    platformBudget: {
      limitUsd: number
      spentUsd: number
      remainingUsd: number
    }
    byProvider: Record<string, { messages: number; costUsd: number }>
  }
  events?: Array<{
    id: string
    timestamp: string
    provider: string
    mode: 'closed' | 'open_web'
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
    chargedToPlatform: boolean
  }>
  error?: string
}

function prettyDollars(value: number): string {
  return `$${value.toFixed(4)}`
}

export default function UsagePage() {
  const [payload, setPayload] = useState<UsagePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await fetch('/api/chat/usage', { cache: 'no-store' })
        const next = (await response.json()) as UsagePayload
        if (!response.ok || !next.ok) {
          throw new Error(next.error || 'Unable to load usage.')
        }
        if (!cancelled) {
          setPayload(next)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load usage.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="shell-content-pad mx-auto max-w-6xl pb-16">
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: 'SETTINGS', href: '/settings' },
              { label: 'USAGE' },
            ]}
          />

          <header className="mb-8">
            <p className="text-label vw-small mb-2 text-gold">AI USAGE</p>
            <h1 className="vw-heading-md mb-3">Brain Usage + Cost Controls</h1>
            <p className="vw-body text-secondary">
              Monitor quota state, provider distribution, and platform spend in
              one place.
            </p>
          </header>

          {loading && (
            <section
              className="border px-6 py-6"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="vw-small text-secondary">Loading usage...</p>
            </section>
          )}

          {!loading && error && (
            <section
              className="border px-6 py-6"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="vw-small text-secondary">{error}</p>
            </section>
          )}

          {!loading && !error && payload?.summary && (
            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-3">
                <article
                  className="border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">QUOTA STATE</p>
                  <p className="vw-body mt-2 uppercase">
                    {payload.summary.quota.state}
                  </p>
                  <p className="vw-small mt-2 text-secondary">
                    {payload.summary.quota.used} /{' '}
                    {payload.summary.quota.freeCap +
                      payload.summary.quota.subscriptionCredit}{' '}
                    platform-funded requests
                  </p>
                </article>
                <article
                  className="border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">
                    PLATFORM SPEND
                  </p>
                  <p className="vw-body mt-2">
                    {prettyDollars(payload.summary.platformBudget.spentUsd)}
                  </p>
                  <p className="vw-small mt-2 text-secondary">
                    Remaining{' '}
                    {prettyDollars(payload.summary.platformBudget.remainingUsd)}
                  </p>
                </article>
                <article
                  className="border px-5 py-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">
                    TOTAL MESSAGES
                  </p>
                  <p className="vw-body mt-2 oldstyle-nums">
                    {payload.summary.totalMessages}
                  </p>
                  <p className="vw-small mt-2 text-secondary">
                    Estimated value{' '}
                    {prettyDollars(payload.summary.totalCostUsd)}
                  </p>
                </article>
              </section>

              <section
                className="border px-5 py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small mb-3 text-gold">
                  BY PROVIDER
                </p>
                <div className="grid gap-2">
                  {Object.entries(payload.summary.byProvider).map(
                    ([provider, bucket]) => (
                      <div
                        key={provider}
                        className="flex items-center justify-between gap-3"
                      >
                        <p className="vw-small text-secondary uppercase">
                          {provider}
                        </p>
                        <p className="vw-small text-secondary oldstyle-nums">
                          {bucket.messages} msgs ·{' '}
                          {prettyDollars(bucket.costUsd)}
                        </p>
                      </div>
                    ),
                  )}
                  {Object.keys(payload.summary.byProvider).length === 0 && (
                    <p className="vw-small text-muted">
                      No usage yet this month.
                    </p>
                  )}
                </div>
              </section>

              <section
                className="border px-5 py-4"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small mb-3 text-gold">
                  RECENT REQUESTS
                </p>
                <div className="grid gap-3">
                  {(payload.events || []).slice(0, 20).map((event) => (
                    <div
                      key={event.id}
                      className="border px-4 py-3"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <p className="vw-small text-secondary">
                        {new Date(event.timestamp).toLocaleString()} ·{' '}
                        <span className="uppercase">{event.provider}</span> ·{' '}
                        {event.mode === 'open_web' ? 'Open Web' : 'Closed RAG'}
                      </p>
                      <p className="vw-small mt-1 text-muted oldstyle-nums">
                        in {event.inputTokens} / out {event.outputTokens} ·{' '}
                        {prettyDollars(event.estimatedCostUsd)} ·{' '}
                        {event.chargedToPlatform ? 'platform' : 'BYO'}
                      </p>
                    </div>
                  ))}
                  {(payload.events || []).length === 0 && (
                    <p className="vw-small text-muted">
                      No logged requests yet.
                    </p>
                  )}
                </div>
              </section>

              <Link
                href="/settings"
                className="text-label vw-small link-highlight"
              >
                Back to settings
              </Link>
            </div>
          )}
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
