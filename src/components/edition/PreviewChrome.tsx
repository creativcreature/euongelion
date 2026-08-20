'use client'

/**
 * Approve/reject chrome for the finished-state preview (SA-114 / F-158).
 *
 * Wraps a piece of the rendered paper that has not been approved yet: a
 * dashed frame, a status ribbon, and the same verdict API the queue uses.
 * The piece inside is the REAL rendering — the founder sees exactly what
 * readers will see, then rules on it in place.
 */
import { useState } from 'react'

/** Plain-English names — the founder should never have to parse a kind slug. */
const KIND_NAME: Record<string, string> = {
  lead: 'The lead devotional',
  strip: 'The comic strip',
  practice: 'The practice',
  screening: 'The screening',
  notice: 'The notice',
  letter: 'The letter',
  witness: 'The witness',
}

export default function PreviewChrome({
  id,
  kind,
  status,
  children,
}: {
  id: string
  kind: string
  status: string
  children: React.ReactNode
}) {
  const [verdict, setVerdict] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'published' || verdict === 'published') {
    return (
      <div className="preview-chrome preview-chrome--approved">
        {verdict === 'published' && (
          <p className="preview-ribbon">APPROVED — prints at the 7am flip</p>
        )}
        {children}
      </div>
    )
  }
  if (verdict === 'rejected') {
    return (
      <div className="preview-chrome preview-chrome--rejected">
        <p className="preview-ribbon">REJECTED — will not print</p>
      </div>
    )
  }

  async function rule(v: 'published' | 'rejected') {
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/edition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, verdict: v }),
      })
      const body = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`)
      setVerdict(v)
      // The command bar recounts on this (SA-114) — the mark drops with the
      // re-render because the draft branch below no longer renders.
      window.dispatchEvent(new CustomEvent('preview-verdict'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verdict failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="preview-chrome preview-chrome--draft" data-preview-draft="">
      <div className="preview-bar">
        <span className="preview-ribbon">
          NEEDS YOUR EYE — {KIND_NAME[kind] ?? kind} — prints at 7am unless you
          reject
        </span>
        <span className="preview-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => rule('published')}
            className="preview-btn preview-btn--approve"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => rule('rejected')}
            className="preview-btn"
          >
            Reject
          </button>
        </span>
      </div>
      {error && <p className="preview-error">{error}</p>}
      {children}
    </div>
  )
}
