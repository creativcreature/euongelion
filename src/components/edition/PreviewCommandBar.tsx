'use client'

/**
 * The preview command bar (SA-114 / F-158).
 *
 * Founder, on the first live preview: "looks very confusing." The paper is
 * ~17,000px tall and, scrolled, the preview looked identical to the live
 * page — no sign of which day this was, what still needed a verdict, or
 * where those pieces were. This bar is the answer: it stays fixed at the
 * bottom, names the edition, counts the pieces still awaiting a verdict
 * (live — PreviewChrome marks them with data-preview-draft and announces
 * every verdict via the `preview-verdict` event), and REVIEW NEXT jumps
 * between them. One control surface for the whole page.
 */
import { useCallback, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

function countAwaiting() {
  return document.querySelectorAll('[data-preview-draft]').length
}

/** The external system is the DOM: PreviewChrome marks awaiting pieces and
 *  announces every verdict. -1 = server render (count unknown until DOM). */
function subscribeToVerdicts(onChange: () => void) {
  window.addEventListener('preview-verdict', onChange)
  return () => window.removeEventListener('preview-verdict', onChange)
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function PreviewCommandBar({
  date,
  prev,
  next,
}: {
  date: string
  prev: string
  next: string
}) {
  const [cursor, setCursor] = useState(0)
  const awaiting = useSyncExternalStore(
    subscribeToVerdicts,
    countAwaiting,
    () => -1,
  )

  const reviewNext = useCallback(() => {
    const marks = Array.from(
      document.querySelectorAll<HTMLElement>('[data-preview-draft]'),
    )
    if (marks.length === 0) return
    const target = marks[cursor % marks.length]
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setCursor((c) => c + 1)
  }, [cursor])

  return (
    <div
      className="preview-commandbar"
      role="region"
      aria-label="Preview controls"
    >
      <Link
        href={`/admin/preview/daily-bread?date=${prev}`}
        aria-label="Previous day"
        className="preview-cb-nav"
      >
        ← Prev
      </Link>

      <div className="preview-cb-center">
        <p className="preview-cb-date">
          PREVIEWING {formatDay(date)} · {date}
        </p>
        {awaiting < 0 ? null : awaiting > 0 ? (
          <p className="preview-cb-count">
            {awaiting} piece{awaiting === 1 ? '' : 's'} await
            {awaiting === 1 ? 's' : ''} your verdict — unrejected drafts print
            at 7am
          </p>
        ) : (
          <p className="preview-cb-count">
            Nothing awaits your verdict — this paper prints itself at 7am.
          </p>
        )}
      </div>

      {awaiting > 0 && (
        <button type="button" onClick={reviewNext} className="preview-cb-jump">
          Review next ↓
        </button>
      )}

      <Link
        href={`/admin/preview/daily-bread?date=${next}`}
        aria-label="Next day"
        className="preview-cb-nav"
      >
        Next →
      </Link>
    </div>
  )
}
