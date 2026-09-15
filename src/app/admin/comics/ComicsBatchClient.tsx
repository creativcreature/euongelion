'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

export interface WeekStrip {
  id: string
  publishDate: string
  status: 'draft' | 'approved' | 'published' | 'rejected'
  image: string
  alt: string
  caption: string
  width: number
  height: number
}

export interface WeekOfStrips {
  monday: string
  isCurrent: boolean
  strips: WeekStrip[]
}

type Verdict = 'published' | 'rejected'

function weekLabel(monday: string): string {
  const d = new Date(`${monday}T00:00:00Z`)
  return `Week of ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}`
}

/** One verdict through the existing review endpoint. Throws with the server's own words. */
async function postVerdict(id: string, verdict: Verdict): Promise<'recorded' | 'conflict'> {
  const response = await fetch('/api/admin/edition', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, verdict }),
  })
  if (response.status === 409) return 'conflict'
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // The status line is all there is.
    }
    throw new Error(message)
  }
  return 'recorded'
}

export default function ComicsBatchClient({ weeks }: { weeks: WeekOfStrips[] }) {
  const router = useRouter()
  const [statuses, setStatuses] = useState<Record<string, WeekStrip['status']>>(() =>
    Object.fromEntries(weeks.flatMap((w) => w.strips.map((s) => [s.id, s.status]))),
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)

  const drafts = useMemo(
    () => weeks.flatMap((w) => w.strips.filter((s) => statuses[s.id] === 'draft')),
    [weeks, statuses],
  )
  const missing = weeks.filter((w) => w.monday >= (weeks.find((x) => x.isCurrent)?.monday ?? '') && w.strips.length === 0)

  async function decide(ids: string[], verdict: Verdict) {
    setError(null)
    for (const id of ids) {
      setBusy(id)
      try {
        const outcome = await postVerdict(id, verdict)
        if (outcome === 'conflict') {
          // Someone (or another tab) already ruled on it: show the truth.
          router.refresh()
          continue
        }
        setStatuses((prev) => ({ ...prev, [id]: verdict }))
      } catch (e) {
        setError(`Could not record the verdict: ${e instanceof Error ? e.message : String(e)}`)
        break
      }
    }
    setBusy(null)
    setConfirmAll(false)
  }

  return (
    <div className="grid gap-6">
      <div className="border border-[var(--color-border-strong)] p-4 grid gap-2">
        <p className="vw-body">
          {drafts.length === 0
            ? 'No strips are waiting for your approval.'
            : `${drafts.length} ${drafts.length === 1 ? 'strip is' : 'strips are'} waiting for your approval.`}
        </p>
        <p className="vw-small text-secondary">
          One strip per week. An approved strip prints every day of its week. A week with no
          approved strip reprints a past one, credited as a reprint.
          {missing.length > 0 ? ` ${missing.length} upcoming ${missing.length === 1 ? 'week has' : 'weeks have'} no strip yet.` : ''}
        </p>
        {drafts.length > 0 ? (
          <div className="flex flex-wrap gap-3 mt-1">
            {confirmAll ? (
              <>
                <button
                  type="button"
                  className="border border-[var(--color-border-strong)] px-4 min-h-[44px] text-label vw-small"
                  disabled={busy !== null}
                  onClick={() => decide(drafts.map((d) => d.id), 'published')}
                >
                  Yes — approve all {drafts.length}
                </button>
                <button
                  type="button"
                  className="border border-[var(--color-border)] px-4 min-h-[44px] text-label vw-small"
                  onClick={() => setConfirmAll(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="border border-[var(--color-border-strong)] px-4 min-h-[44px] text-label vw-small"
                disabled={busy !== null}
                onClick={() => setConfirmAll(true)}
              >
                Approve all {drafts.length} drafts
              </button>
            )}
          </div>
        ) : null}
        {error ? (
          <p className="vw-small" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {weeks.map((week) => (
        <section key={week.monday} className="grid gap-3" aria-labelledby={`week-${week.monday}`}>
          <h2 id={`week-${week.monday}`} className="text-label vw-small">
            {weekLabel(week.monday)}
            {week.isCurrent ? ' · this week' : ''}
          </h2>
          {week.strips.length === 0 ? (
            <p className="vw-small text-secondary border border-dashed border-[var(--color-border)] p-3">
              No strip for this week yet.
            </p>
          ) : (
            week.strips.map((strip) => {
              const status = statuses[strip.id]
              return (
                <figure key={strip.id} className="grid gap-2 border border-[var(--color-border)] p-3" data-status={status}>
                  <Image
                    src={strip.image}
                    alt={strip.alt}
                    width={strip.width}
                    height={strip.height}
                    sizes="(max-width: 900px) 100vw, 900px"
                    style={{ width: '100%', height: 'auto' }}
                  />
                  <figcaption className="grid gap-1">
                    <span className="vw-body">{strip.caption}</span>
                    <span className="vw-small text-secondary">{strip.alt}</span>
                    <span className="text-label vw-small">
                      {status === 'published' || status === 'approved'
                        ? 'Approved — prints every day this week'
                        : status === 'rejected'
                          ? 'Rejected — will not print'
                          : 'Waiting for your approval'}
                      {strip.publishDate !== week.monday ? ` · dated ${strip.publishDate}` : ''}
                    </span>
                  </figcaption>
                  {status === 'draft' ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="border border-[var(--color-border-strong)] px-4 min-h-[44px] text-label vw-small"
                        disabled={busy !== null}
                        onClick={() => decide([strip.id], 'published')}
                      >
                        {busy === strip.id ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="border border-[var(--color-border)] px-4 min-h-[44px] text-label vw-small"
                        disabled={busy !== null}
                        onClick={() => decide([strip.id], 'rejected')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </figure>
              )
            })
          )}
        </section>
      ))}
    </div>
  )
}
