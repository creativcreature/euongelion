'use client'

/**
 * MOVE 3 — dotted leaders and bracketed indices.
 *
 * The contents row stops being a menu and becomes an INDEX. Straight from
 * Nous Portal. Press the number and go — the paper becomes keyboard-
 * addressable without introducing a command line.
 *
 * The leaders are real: a repeating dot mask that fills whatever space is
 * left between the label and the index, at any width.
 */
import { useEffect, useState } from 'react'

const ROWS = [
  { label: 'THE READING', meta: 'John 15 · 4 min' },
  { label: 'THE PRAYER', meta: 'Collect · 40 sec' },
  { label: 'THE WORD', meta: 'ἀγάπη · agapē' },
  { label: 'THE STRIP', meta: 'no. 240' },
  { label: 'CROSSWORD', meta: '13 across' },
  { label: 'THE GALLERY', meta: '6 plates' },
]

export default function LeaderIndex() {
  const [hit, setHit] = useState<number | null>(null)
  const [log, setLog] = useState<string>('press a number, or click a row')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10)
      if (!Number.isNaN(n) && n >= 1 && n <= ROWS.length) {
        setHit(n - 1)
        setLog(`→ jumped to ${ROWS[n - 1].label} (key ${n})`)
        if ('vibrate' in navigator) navigator.vibrate?.(10)
        setTimeout(() => setHit(null), 550)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="lab-demo">
      <div className="lab-index" tabIndex={0}>
        {ROWS.map((r, i) => (
          <button
            key={r.label}
            className={`lab-index-row ${hit === i ? 'hit' : ''}`}
            onClick={() => {
              setHit(i)
              setLog(`→ jumped to ${r.label} (click)`)
              if ('vibrate' in navigator) navigator.vibrate?.(10)
              setTimeout(() => setHit(null), 550)
            }}
          >
            <span className="lab-index-label">{r.label}</span>
            <span className="lab-index-dots" aria-hidden="true" />
            <span className="lab-index-meta">{r.meta}</span>
            <span className="lab-index-num">[{i + 1}]</span>
          </button>
        ))}
      </div>
      <p className="lab-hint">
        <strong>Click into the block, then press 1–6.</strong> {log}. The
        leaders are generated, not typed — they fill whatever gap is left at any
        width, so this survives a phone.
      </p>
    </div>
  )
}
