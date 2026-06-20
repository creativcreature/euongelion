'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { getWordNote } from '@/lib/wordnote'

/**
 * WordNote — an inline word-study primitive. A keyword carries a crimson dotted
 * underline; activating it opens a small footnote card with the original-language
 * word, transliteration, a lexicon-grounded gloss, and its source attribution.
 *
 * Content references a note by bank `id` only. If the id does not resolve to a
 * real grounded entry, the surface text renders plain (NO fabricated note) — the
 * primitive never invents a definition.
 *
 * Accessible disclosure: button trigger with aria-expanded/aria-controls, the
 * card is a labelled note region, Escape and outside-click close it, focus
 * returns to the trigger. No motion (reduced-motion safe by construction).
 */
export default function WordNote({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const note = getWordNote(id)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cardId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    function onPointer(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  // No grounded entry → render the plain text, never a fabricated note.
  if (!note) {
    if (process.env.NODE_ENV !== 'production') {
      // Surface the authoring mistake in dev without breaking the reader.
      console.warn(
        `[WordNote] no bank entry for id "${id}" — rendering plain text`,
      )
    }
    return <>{children}</>
  }

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={cardId}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer bg-transparent p-0"
        style={{
          font: 'inherit',
          color: 'inherit',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: 'var(--color-crimson)',
          textUnderlineOffset: '0.18em',
          textDecorationThickness: '1.5px',
        }}
      >
        {children}
      </button>

      {open && (
        <span
          id={cardId}
          role="note"
          aria-label={`Word study: ${note.term}`}
          className="absolute left-0 top-full z-30 mt-2 block"
          style={{
            width: 'max-content',
            maxWidth: 'min(20rem, 90vw)',
            backgroundColor: 'var(--color-surface)',
            border:
              '1px solid color-mix(in srgb, var(--color-crimson) 40%, transparent)',
            borderRadius: '2px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
            padding: '0.9rem 1rem',
            textAlign: 'left',
          }}
        >
          <span
            className="text-label vw-small block"
            style={{ color: 'var(--color-crimson)' }}
          >
            {note.term}
          </span>
          <span
            className="wordnote-word text-serif-italic mt-1 block"
            style={{ fontSize: '1.35rem', lineHeight: 1.15 }}
          >
            {note.word}
            <span className="vw-small ml-2 not-italic text-muted">
              {note.xlit}
            </span>
          </span>
          <span className="vw-body mt-2 block leading-relaxed text-secondary">
            {note.gloss}
          </span>
          <span className="wordnote-source vw-small mt-3 block text-muted">
            {note.source}
          </span>
        </span>
      )}
    </span>
  )
}
