'use client'

/**
 * The founder's response box (SA-114 / F-158): a verdict — APPROVE /
 * REJECT / PARK — and/or a comment, appended to the pitch's thread. This
 * is the "respond on" half of the founder's ask.
 */
import { useState } from 'react'

interface PitchResponse {
  at: string
  verdict: string
  comment: string
}

const VERDICT_LABEL: Record<string, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  parked: 'PARKED',
  comment: 'NOTE',
}

export default function PitchRespondClient({
  slug,
  initialResponses,
}: {
  slug: string
  initialResponses: PitchResponse[]
}) {
  const [responses, setResponses] = useState(initialResponses)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(verdict: string) {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, verdict, comment: comment.trim() }),
      })
      const body = (await r.json()) as {
        ok?: boolean
        responses?: PitchResponse[]
        error?: string
      }
      if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`)
      setResponses(body.responses ?? [])
      setComment('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Response failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Your responses" className="mt-8">
      <h2 className="text-label vw-small mb-3 text-gold">YOUR RESPONSES</h2>
      {responses.length === 0 ? (
        <p className="vw-small text-muted mb-4">Nothing yet — rule below.</p>
      ) : (
        <div className="mb-4 grid gap-2">
          {responses.map((r, i) => (
            <div key={i} className="border border-[var(--color-border)] p-3">
              <p className="text-label vw-small text-gold">
                {VERDICT_LABEL[r.verdict] ?? r.verdict} ·{' '}
                {r.at.slice(0, 16).replace('T', ' ')}
              </p>
              {r.comment && <p className="vw-body mt-1">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      <textarea
        aria-label="Your response"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Say anything — direction, edits, questions. Verdict buttons work with or without words."
        className="vw-body mb-3 w-full border border-[var(--color-border)] bg-transparent p-3"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void send('approved')}
          className="text-label vw-small border border-[var(--color-border-strong)] px-3 py-2"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send('rejected')}
          className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send('parked')}
          className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
        >
          Park
        </button>
        <button
          type="button"
          disabled={busy || !comment.trim()}
          onClick={() => void send('comment')}
          className="text-label vw-small border border-[var(--color-border)] px-3 py-2"
        >
          Comment only
        </button>
      </div>
      {error && (
        <p role="alert" className="vw-small mt-3 text-muted">
          {error}
        </p>
      )}
    </section>
  )
}
