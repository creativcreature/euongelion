'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { EditionItem, EditionKind } from '@/lib/edition/kinds'

/**
 * The review queue for The Daily Bread (SA-090 / F-136).
 *
 * Only invented voice and third-party items land here — computed sections
 * (crossword, word study, prayer, gallery…) publish as approved because there
 * is nothing in a computed crossword to review.
 *
 * FAILURE IS VISIBLE (Development Rule 1). A queue that fails to load renders
 * the database's own message, never an empty list: "nothing waiting" and "the
 * read broke" must never look the same to the person clearing the queue.
 */

/** Distributed so `kind` actually narrows `payload`. `EditionItem` on its own
 *  pairs the full kind union with the full payload union independently. */
type QueueItem = { [K in EditionKind]: EditionItem<K> }[EditionKind] & {
  id: string
}

const KIND_LABEL: Record<EditionKind, string> = {
  lead: 'LEAD',
  rail: 'RAIL',
  season: 'SEASON',
  word: 'WORD',
  practice: 'PRACTICE',
  guide: 'GUIDE',
  strip: 'STRIP',
  crossword: 'CROSSWORD',
  unscramble: 'UNSCRAMBLE',
  quiz: 'QUIZ',
  gallery: 'GALLERY',
  screening: 'SCREENING',
  prayer: 'PRAYER',
  witness: 'WITNESS',
  letter: 'LETTER',
  notice: 'NOTICE',
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatEditionDate(date: string): string {
  return DATE_FORMAT.format(new Date(`${date}T00:00:00Z`))
}

function errorMessageFrom(body: unknown, status: number): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { error?: unknown }).error === 'string'
  ) {
    return (body as { error: string }).error
  }
  return `The queue request failed (HTTP ${status}).`
}

function isQueuePayload(body: unknown): body is { items: QueueItem[] } {
  if (typeof body !== 'object' || body === null) return false
  const items = (body as { items?: unknown }).items
  if (!Array.isArray(items)) return false
  return items.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { id?: unknown }).id === 'string' &&
      typeof (item as { kind?: unknown }).kind === 'string' &&
      typeof (item as { publishDate?: unknown }).publishDate === 'string',
  )
}

/** One line of "what am I approving". Kind-aware, because a caption and a
 *  third-party video need different things in front of a reviewer's eyes. */
function PayloadSummary({ item }: { item: QueueItem }): ReactNode {
  switch (item.kind) {
    case 'lead': {
      const payload = item.payload
      if (payload.mode === 'rotation') {
        return (
          <p className="vw-body">
            <span className="text-label vw-small text-muted">Rotation — </span>
            {payload.slug}
          </p>
        )
      }
      return (
        <>
          <p className="vw-body">{payload.title}</p>
          {payload.standfirst ? (
            <p className="vw-small mt-1 text-secondary">{payload.standfirst}</p>
          ) : null}
          {payload.scriptureReference ? (
            <p className="text-label vw-small mt-1 text-muted">
              {payload.scriptureReference}
            </p>
          ) : null}
          {/* The WHOLE body. This is the longest piece of invented voice in
              the paper — the queue exists so it is read before it prints. */}
          {payload.body ? (
            <div className="vw-small mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap border border-[var(--color-border)] p-3">
              {payload.body}
            </div>
          ) : null}
          {payload.pullQuotes && payload.pullQuotes.length > 0 ? (
            <ul className="vw-small mt-2 list-disc pl-5 text-secondary">
              {payload.pullQuotes.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          ) : null}
        </>
      )
    }
    case 'practice':
      return (
        <>
          <p className="vw-body">{item.payload.instruction}</p>
          <p className="vw-small mt-1 text-secondary">
            {item.payload.reason} · {item.payload.duration}
          </p>
        </>
      )
    case 'strip':
      return (
        <>
          {/* The panel itself, at reviewable size. The queue exists to keep a
              defective drawing off the page — approving artwork sight-unseen
              is the fedora failure mode all over again. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.payload.image}
            alt={item.payload.alt}
            className="mb-2 max-h-64 w-full border border-[var(--color-border)] object-contain"
          />
          <p className="vw-body">{item.payload.caption}</p>
          <p className="vw-small mt-1 text-secondary">
            Panel {item.payload.panelId} — {item.payload.alt}
          </p>
        </>
      )
    case 'screening':
      return (
        <>
          {/* Third-party thumbnail on a remote host: plain img, no optimizer.
              The approver has to SEE the frame they are putting on the page. */}
          {item.payload.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.payload.thumbnail}
              alt={`Thumbnail for ${item.payload.title}`}
              className="mb-2 max-h-48 border border-[var(--color-border)] object-contain"
            />
          ) : null}
          <p className="vw-body">{item.payload.title}</p>
          {item.payload.blurb ? (
            <p className="vw-small mt-1">{item.payload.blurb}</p>
          ) : null}
          <p className="vw-small mt-1 text-secondary">
            {item.payload.kind === 'video' ? 'Video' : 'Article'} ·{' '}
            {item.payload.sourceName}
          </p>
          {item.payload.videoId ? (
            <p className="text-label vw-small mt-1 text-muted">
              YouTube id: {item.payload.videoId}
            </p>
          ) : null}
          <a
            href={item.payload.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="vw-small link-highlight break-all"
          >
            {item.payload.sourceUrl}
          </a>
        </>
      )
    case 'letter':
      return (
        <>
          <p className="vw-body">{item.payload.body}</p>
          <p className="vw-small mt-1 text-secondary">— {item.payload.from}</p>
        </>
      )
    case 'notice':
      return (
        <>
          <p className="vw-body">{item.payload.title}</p>
          <p className="vw-small mt-1 text-secondary">
            {item.payload.body} · {item.payload.by}
          </p>
          {/* Where the notice sends a reader. Approving a link you cannot read
              is approving a destination you have not seen. */}
          {item.payload.href ? (
            <a
              href={item.payload.href}
              target="_blank"
              rel="noreferrer noopener"
              className="vw-small link-highlight mt-1 block break-all"
            >
              {item.payload.href}
            </a>
          ) : null}
        </>
      )
    default:
      // Deterministic kinds publish as approved and should never queue. If one
      // does, show the reviewer the actual payload rather than an empty card.
      return (
        <pre className="vw-small overflow-x-auto text-secondary">
          {JSON.stringify(item.payload, null, 2)}
        </pre>
      )
  }
}

/**
 * A verdict either moved the row ('recorded') or found it already reviewed
 * somewhere else ('conflict', HTTP 409). Every other non-OK response throws:
 * a write that did not happen must never read as one that did.
 */
type VerdictOutcome = 'recorded' | 'conflict'

const CONFLICT_MESSAGE =
  'That item had already been reviewed somewhere else, so this verdict changed nothing. The queue has been re-read from the database.'

async function postVerdict(
  id: string,
  verdict: 'published' | 'rejected',
): Promise<VerdictOutcome> {
  const response = await fetch('/api/admin/edition', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, verdict }),
  })

  if (response.status === 409) return 'conflict'

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error(
        `The verdict was rejected and the response was unreadable (HTTP ${response.status}).`,
      )
    }
    return 'recorded'
  }

  if (!response.ok) {
    throw new Error(errorMessageFrom(body, response.status))
  }
  return 'recorded'
}

/** Read the queue. THROWS with the server's own message — the caller decides
 *  whether that is a page-level failure or a note on top of a stale list. */
async function fetchQueue(): Promise<QueueItem[]> {
  const response = await fetch('/api/admin/edition', {
    credentials: 'same-origin',
  })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    throw new Error(
      `The queue endpoint returned an unreadable body (HTTP ${response.status}).`,
    )
  }

  if (!response.ok) {
    throw new Error(errorMessageFrom(body, response.status))
  }
  if (!isQueuePayload(body)) {
    throw new Error(
      'The queue endpoint returned a shape this page does not recognise.',
    )
  }
  return body.items
}

export default function EditionQueueClient() {
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmingBulk, setConfirmingBulk] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const fresh = await fetchQueue()
        if (cancelled) return
        setItems(fresh)
        setLoadError(null)
      } catch (error) {
        if (cancelled) return
        setLoadError(
          error instanceof Error
            ? error.message
            : 'The review queue could not be loaded.',
        )
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Re-read the queue after a verdict the database refused. `fallback` is what
   * stays on screen if the re-read ALSO fails — with the reason attached, so a
   * stale list is never mistaken for a fresh one (Development Rule 1).
   */
  const resync = useCallback(async (fallback: QueueItem[], reason: string) => {
    try {
      const fresh = await fetchQueue()
      setItems(fresh)
      setActionError(reason)
    } catch (error) {
      setItems(fallback)
      setActionError(
        `${reason} The re-read failed too, so this list may be stale: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      )
    }
  }, [])

  const review = useCallback(
    async (item: QueueItem, verdict: 'published' | 'rejected') => {
      setActionError(null)
      setConfirmingBulk(false)
      const snapshot = items
      if (!snapshot) return

      // Optimistic: the card goes now, and comes back if the write fails.
      setItems(snapshot.filter((entry) => entry.id !== item.id))
      setBusy(true)
      try {
        const outcome = await postVerdict(item.id, verdict)
        if (outcome === 'conflict') {
          // The row was no longer a draft. The card must NOT disappear on the
          // strength of a verdict that changed nothing.
          await resync(snapshot, CONFLICT_MESSAGE)
        }
      } catch (error) {
        setItems(snapshot)
        setActionError(
          error instanceof Error
            ? error.message
            : `The verdict for ${item.kind} on ${item.publishDate} did not save.`,
        )
      } finally {
        setBusy(false)
      }
    },
    [items, resync],
  )

  const approveAllShown = useCallback(async () => {
    const snapshot = items
    if (!snapshot || snapshot.length === 0) return

    if (!confirmingBulk) {
      setConfirmingBulk(true)
      return
    }

    setConfirmingBulk(false)
    setActionError(null)
    setBusy(true)

    // Each card leaves the list only after ITS OWN post succeeds, and the loop
    // STOPS at the first failure. Emptying the list up front would tell an
    // admin who closes the tab mid-run that a queue they never finished is
    // clear — the worst lie this page could tell.
    let remaining = snapshot
    let failure: string | null = null
    let conflicted = false

    try {
      for (const item of snapshot) {
        try {
          const outcome = await postVerdict(item.id, 'published')
          if (outcome === 'conflict') {
            conflicted = true
            failure = CONFLICT_MESSAGE
            break
          }
        } catch (error) {
          failure =
            error instanceof Error
              ? error.message
              : `The verdict for ${item.kind} on ${item.publishDate} did not save.`
          break
        }
        remaining = remaining.filter((entry) => entry.id !== item.id)
        setItems(remaining)
      }

      if (!failure) return

      const done = snapshot.length - remaining.length
      const preamble = `Stopped after ${done} of ${snapshot.length}. The rest are still waiting.`
      if (conflicted) {
        await resync(remaining, `${preamble} ${failure}`)
        return
      }
      setItems(remaining)
      setActionError(`${preamble} ${failure}`)
    } finally {
      setBusy(false)
    }
  }, [confirmingBulk, items, resync])

  const groups = useMemo(() => {
    if (!items) return []
    const byDate = new Map<string, QueueItem[]>()
    for (const item of items) {
      const bucket = byDate.get(item.publishDate)
      if (bucket) bucket.push(item)
      else byDate.set(item.publishDate, [item])
    }
    return [...byDate.entries()]
  }, [items])

  if (loadError) {
    return (
      <div
        role="alert"
        className="border border-[var(--color-border-strong)] p-4"
      >
        <p className="text-label vw-small mb-2 text-gold">
          THE QUEUE DID NOT LOAD
        </p>
        <p className="vw-body">{loadError}</p>
        <p className="vw-small mt-2 text-secondary">
          Nothing has been approved or rejected. This is the read failing, not
          an empty queue.
        </p>
      </div>
    )
  }

  if (items === null) {
    return (
      <p className="text-label vw-small text-muted" role="status">
        Loading the queue…
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="border border-[var(--color-border)] p-4">
        <p className="text-label vw-small mb-2 text-gold">NOTHING WAITING</p>
        <p className="vw-body">
          Every drafted section has a verdict. The next run will fill this
          again.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-border)] p-3">
        <p className="text-label vw-small text-muted">
          {items.length} awaiting review
        </p>
        <button
          type="button"
          onClick={() => {
            void approveAllShown()
          }}
          disabled={busy}
          className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
        >
          {confirmingBulk
            ? `Really approve ${items.length}?`
            : 'Approve all shown'}
        </button>
      </div>

      {actionError ? (
        <p
          role="alert"
          className="vw-small mb-6 border border-[var(--color-border-strong)] p-3"
        >
          {actionError}
        </p>
      ) : null}

      {groups.map(([date, dayItems]) => (
        <section
          key={date}
          data-testid={`edition-group-${date}`}
          className="mb-8"
        >
          <header className="mb-3 border-b border-[var(--color-border)] pb-2">
            <h2 className="vw-body">{formatEditionDate(date)}</h2>
            <p className="text-label vw-small text-muted">{date}</p>
          </header>

          <div className="grid gap-3">
            {dayItems.map((item) => (
              <article
                key={item.id}
                data-testid={`edition-item-${item.id}`}
                className="border border-[var(--color-border)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-label vw-small text-gold">
                    {KIND_LABEL[item.kind]}
                  </p>
                  <p className="text-label vw-small text-muted">
                    Slot {item.slot}
                  </p>
                </div>

                <div className="mb-3">
                  <PayloadSummary item={item} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void review(item, 'published')
                    }}
                    className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void review(item, 'rejected')
                    }}
                    className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
