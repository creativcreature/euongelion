'use client'

/**
 * One move: the live thing, then the verdict.
 *
 * The verdict box writes to the EXISTING pitch archive (SA-114 / F-158) via
 * /api/admin/pitches, keyed by this move's own slug. That is deliberate —
 * the founder's standing rule is one archive, one place, forever. A verdict
 * left here shows up at /admin/pitches beside every other decision instead
 * of in a second system nobody reads.
 */
import { useState } from 'react'

interface Resp {
  at: string
  verdict: string
  comment: string
}

const LABEL: Record<string, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  parked: 'PARKED',
  comment: 'NOTE',
}

export default function MoveCard({
  n,
  title,
  slug,
  what,
  look,
  effort,
  risk,
  initialResponses,
  children,
}: {
  n: number
  title: string
  slug: string
  what: string
  look: string
  effort: string
  risk: string
  initialResponses: Resp[]
  children: React.ReactNode
}) {
  const [responses, setResponses] = useState<Resp[]>(initialResponses)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send(verdict: string) {
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch('/api/admin/pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, verdict, comment: comment.trim() }),
      })
      const b = (await r.json()) as {
        ok?: boolean
        responses?: Resp[]
        error?: string
      }
      if (!r.ok || !b.ok) throw new Error(b.error ?? `HTTP ${r.status}`)
      setResponses(b.responses ?? [])
      setComment('')
      if ('vibrate' in navigator) navigator.vibrate?.(14)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed')
    } finally {
      setBusy(false)
    }
  }

  const latest = responses[responses.length - 1]

  return (
    <section className="lab-move" id={`m${n}`}>
      <header className="lab-move-head">
        <span className="lab-move-n">{String(n).padStart(2, '0')}</span>
        <h2>{title}</h2>
        {latest && (
          <span className={`lab-verdict-chip v-${latest.verdict}`}>
            {LABEL[latest.verdict] ?? latest.verdict}
          </span>
        )}
      </header>

      <p className="lab-move-what">{what}</p>
      <p className="lab-move-look">
        <strong>What to look for:</strong> {look}
      </p>

      {children}

      <div className="lab-move-cost">
        <span>
          <b>Effort</b> {effort}
        </span>
        <span>
          <b>Risk</b> {risk}
        </span>
      </div>

      <div className="lab-respond">
        {responses.length > 0 && (
          <div className="lab-thread">
            {responses.map((r, i) => (
              <div key={i} className="lab-thread-row">
                <span className={`lab-verdict-chip v-${r.verdict}`}>
                  {LABEL[r.verdict] ?? r.verdict}
                </span>
                <span className="lab-thread-at">
                  {r.at.slice(0, 16).replace('T', ' ')}
                </span>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
        <textarea
          rows={2}
          value={comment}
          placeholder="What do you think of this one? Words are optional — the buttons work alone."
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="lab-respond-btns">
          <button
            className="ok"
            disabled={busy}
            onClick={() => void send('approved')}
          >
            ✓ Build it
          </button>
          <button
            className="no"
            disabled={busy}
            onClick={() => void send('rejected')}
          >
            ✕ Kill it
          </button>
          <button disabled={busy} onClick={() => void send('parked')}>
            Park
          </button>
          <button
            disabled={busy || !comment.trim()}
            onClick={() => void send('comment')}
          >
            Comment only
          </button>
          {busy && <span className="lab-busy">saving…</span>}
          {err && <span className="lab-err">{err}</span>}
        </div>
      </div>
    </section>
  )
}
