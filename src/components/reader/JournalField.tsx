'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReader } from '@/components/reader/ReaderContext'
import { requestAuth } from '@/stores/devotionalLibraryStore'

/**
 * Every kind of writing the reader does, in one control.
 *
 * A reflection answer, a prayer written alongside, and a free entry at the end
 * of a reading are the same act with different framing, so they are the same
 * component with a different `kind`. All three store to the existing
 * `annotations` table — which is already enumerated in `data-export.ts`,
 * `account-deletion.ts` and `retention-cleanup.ts`, so export, deletion and
 * retention work on day one. A new table would silently escape all three.
 *
 * THIS FILE MUST NOT REACH THE CHAT STORE OR THE CHAT ROUTE. Religious belief
 * is special-category data under GDPR Art. 9, and what the reader writes is
 * theirs alone. Selecting published devotional text and asking about it is fine
 * — that is what the highlight toolbar's "Ask" does. Piping what they WROTE is
 * not. Pinned by __tests__/journal-never-leaves-account.test.ts, which greps
 * this file for the route path, so name it in prose rather than in a literal.
 */

export type JournalKind = 'reflection' | 'prayer' | 'entry'

export interface JournalFieldProps {
  kind: JournalKind
  /** Stable identity for this slot, e.g. `m3:q0`. How an answer finds its question. */
  anchorKey: string
  label: string
  placeholder?: string
  /** Copy on the locked control. */
  signedOutLabel?: string
  rows?: number
  /**
   * Show the "kept to your account" reassurance. Once per module, not once per
   * question — repeated under all five prompts on a reflection module it read
   * as noise rather than reassurance.
   */
  showNote?: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

/** Debounce for autosave-while-typing. Blur always saves immediately. */
const DEBOUNCE_MS = 2000

export default function JournalField({
  kind,
  anchorKey,
  label,
  placeholder,
  signedOutLabel = 'Sign in to write',
  rows = 3,
  showNote = false,
}: JournalFieldProps) {
  const { devotionalSlug, signedIn, authKnown } = useReader()
  const [value, setValue] = useState('')
  const [state, setState] = useState<SaveState>('idle')
  const annotationId = useRef<string | null>(null)
  const lastSaved = useRef('')
  const timer = useRef<number | null>(null)

  // Hydrate any previous answer for this slot.
  useEffect(() => {
    if (!signedIn || !devotionalSlug) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch(
          `/api/annotations?devotionalSlug=${encodeURIComponent(devotionalSlug)}&annotationType=note&styleKind=${encodeURIComponent(kind)}`,
          { cache: 'no-store' },
        )
        if (!response.ok || cancelled) return
        const payload = (await response.json()) as {
          annotations?: Array<{
            id: string
            body: string | null
            style: Record<string, unknown> | null
          }>
        }
        const mine = payload.annotations?.find(
          (row) => String(row.style?.anchorKey ?? '') === anchorKey,
        )
        if (!mine || cancelled) return
        annotationId.current = mine.id
        lastSaved.current = mine.body ?? ''
        setValue(mine.body ?? '')
      } catch {
        // A missed hydration leaves an empty box, which is recoverable. It is
        // NOT reported as a save failure — nothing the reader did has failed.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [signedIn, devotionalSlug, kind, anchorKey])

  const save = useCallback(async () => {
    if (!devotionalSlug) return
    const body = value.trim()
    if (!body || body === lastSaved.current) return

    setState('saving')
    const style = {
      kind,
      anchorKey,
      editedAt: new Date().toISOString(),
    }

    try {
      const existing = annotationId.current
      const response = await fetch('/api/annotations', {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          existing
            ? { annotationId: existing, body, style }
            : {
                devotionalSlug,
                annotationType: 'note',
                body,
                style,
              },
        ),
      })

      if (!response.ok) {
        // No silent fallbacks: the reader is told, on the control, that their
        // words are not kept. Nothing is written to localStorage — SA-060
        // reversed device-kept state.
        setState('failed')
        return
      }

      const payload = (await response.json().catch(() => ({}))) as {
        annotation?: { id?: string }
      }
      if (payload.annotation?.id) annotationId.current = payload.annotation.id
      lastSaved.current = body
      setState('saved')
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
    } catch {
      setState('failed')
    }
  }, [devotionalSlug, value, kind, anchorKey])

  // Autosave while typing, so a reader who navigates away mid-thought keeps it.
  useEffect(() => {
    if (!signedIn) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void save(), DEBOUNCE_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [value, signedIn, save])

  const fieldId = `journal-${kind}-${anchorKey.replace(/[^a-z0-9]/gi, '-')}`

  /**
   * No slug means no provider — an archive view, an isolated test, or the
   * AI-plan day renderer, whose days are keyed by plan token rather than by a
   * devotional slug and so have nowhere to anchor an annotation yet.
   *
   * Render NOTHING there, not the locked control. "Sign in to write" shown to
   * a reader who is already signed in would be a lie about why they cannot
   * write, and this must be distinguished from the genuinely signed-out case
   * below.
   */
  if (!devotionalSlug) return null

  // Fail closed. `authKnown === false` means the session probe has not answered
  // yet, and offering an input that might not save is worse than a moment of a
  // locked control.
  if (!authKnown || !signedIn) {
    return (
      <div className="journal-locked">
        <button
          type="button"
          className="journal-locked-cta"
          onClick={() =>
            requestAuth({
              kind: 'journal',
              devotionalSlug: devotionalSlug ?? '',
            })
          }
        >
          {signedOutLabel}
        </button>
        {showNote && (
          <span className="journal-locked-note">
            Your writing is kept to your account, and only yours.
          </span>
        )}

        <style jsx>{`
          .journal-locked {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.6rem;
            margin-top: 0.9rem;
          }
          .journal-locked-cta {
            min-height: 44px;
            padding-inline: 1rem;
            background: transparent;
            border: 1px solid var(--color-border);
            color: var(--color-text-primary, var(--color-fg));
            font-size: 0.7rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .journal-locked-cta:hover {
            border-color: var(--color-text-primary, var(--color-fg));
          }
          .journal-locked-cta:focus-visible {
            outline: 2px solid var(--color-gold);
            outline-offset: 2px;
          }
          .journal-locked-note {
            font-size: 0.72rem;
            color: var(--color-text-muted, var(--color-text-secondary));
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="journal-field">
      <label className="sr-only" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-label={label}
        className="journal-input"
        value={value}
        rows={rows}
        maxLength={4000}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value)
          if (state !== 'idle') setState('idle')
        }}
        onBlur={() => void save()}
      />
      <p className="journal-state" role="status" aria-live="polite">
        {state === 'saving'
          ? 'Saving…'
          : state === 'saved'
            ? 'Saved'
            : state === 'failed'
              ? "Couldn't save — your words are still here. Try again."
              : ''}
      </p>

      <style jsx>{`
        .journal-field {
          margin-top: 0.9rem;
        }
        .journal-input {
          display: block;
          width: 100%;
          padding: 0.7rem 0.8rem;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary, var(--color-fg));
          font-family: var(--font-family-serif, Georgia, serif);
          font-size: 1rem;
          line-height: 1.55;
          resize: vertical;
        }
        .journal-input::placeholder {
          color: var(--color-text-muted, var(--color-text-secondary));
          font-style: italic;
        }
        .journal-input:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 1px;
        }
        .journal-state {
          min-height: 1.1rem;
          margin: 0.3rem 0 0;
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          color: var(--color-text-muted, var(--color-text-secondary));
        }
      `}</style>
    </div>
  )
}
