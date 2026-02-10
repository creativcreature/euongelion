'use client'

import { useState, useCallback } from 'react'
import Toast from './Toast'

interface ShareButtonProps {
  /** Title for share dialog */
  title: string
  /** Text/description for share dialog */
  text?: string
  /** URL to share (defaults to current page) */
  url?: string
  /** Button label */
  label?: string
  className?: string
}

/**
 * Share button — Web Share API with copy-link fallback.
 * Shows toast on successful copy.
 */
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
    const shareData = {
      title,
      text: text || `${title} on Euangelion`,
      url: shareUrl,
    }

    // Try Web Share API first (mobile, some desktop)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // User cancelled or API failed — fall through to clipboard
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
        className={`text-label vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] ${className}`}
        aria-label={`Share ${title}`}
      >
        <span className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
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
