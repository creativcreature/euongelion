'use client'

import { useState, useCallback } from 'react'
import Toast from './Toast'

/**
 * Share button — Web Share API with copy-link fallback.
 * No share counters, no platform-branded icons.
 *
 * PERSONAL-CONTENT SAFETY CONTRACT:
 *   The `text` prop MUST contain only canonical Scripture (verbatim from the
 *   devotional `passage` field) and/or series/page titles.
 *
 *   When used on a Soul Audit "Your Edition" generated-day page, callers
 *   MUST pass only the anchor verse — NEVER the reader's situation text, the
 *   composed prayer, or any AI-generated personal copy.  The shared URL
 *   should be the public page URL (not the private generation endpoint).
 *
 *   Safe example for generated-day pages:
 *     <ShareButton
 *       title="Euangelion · Your Edition"
 *       text={`"${anchorVerse}" — ${verseRef}`}
 *       url={publicVerseUrl}
 *     />
 *
 *   DO NOT pass:
 *     text={userSituation}            // reader's personal text
 *     text={composedDevotionalBody}   // AI-generated personal content
 */
interface ShareButtonProps {
  /** Title for share dialog */
  title: string
  /**
   * Text/description for share dialog.
   * MUST be canonical Scripture or series/page title only.
   * MUST NOT be reader-submitted text or AI-generated personal content.
   */
  text?: string
  /** URL to share (defaults to current page) */
  url?: string
  /** Button label */
  label?: string
  className?: string
}

export default function ShareButton({
  title,
  text,
  url,
  label = 'Share',
  className = '',
}: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false)

  const handleShare = useCallback(async () => {
    const shareUrl = url || window.location.href
    const shareData: ShareData = {
      title,
      text: text ?? `${title} on Euangelion`,
      url: shareUrl,
    }

    // Try Web Share API first (mobile, some desktop)
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      navigator.canShare?.(shareData) !== false
    ) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        // User cancelled (AbortError) — don't fall through to clipboard.
        if (err instanceof Error && err.name === 'AbortError') return
        // Other errors — fall through to clipboard.
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShowToast(true)
    } catch {
      // Last resort: select-and-copy fallback
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setShowToast(true)
    }
  }, [title, text, url])

  return (
    <>
      <button
        onClick={handleShare}
        className={`animated-underline text-label vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] ${className}`}
        aria-label={`Share ${title}`}
      >
        {/* R37: icon + label baseline-aligned. inline-flex keeps
            the button on a text baseline so it sits flush with
            sibling text links in items-baseline rows. */}
        <span className="inline-flex items-baseline gap-2 leading-none">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ transform: 'translateY(0.16em)' }}
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {label}
        </span>
      </button>

      <Toast
        message="Link copied!"
        visible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
