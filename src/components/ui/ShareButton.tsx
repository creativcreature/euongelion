'use client'

import { useState } from 'react'
import { shareContent, canShare, createShareData } from '@/lib/share'

interface ShareButtonProps {
  title: string
  seriesSlug: string
  day?: number
  excerpt?: string
  className?: string
}

export function ShareButton({ title, seriesSlug, day, excerpt, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const data = createShareData(title, seriesSlug, day, excerpt)
    const success = await shareContent(data)

    if (success && !canShare()) {
      // Show copied feedback for clipboard fallback
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] text-gray-400 hover:text-[#f7f3ed] hover:bg-[#252525] transition-colors ${className}`}
      aria-label="Share"
    >
      {copied ? (
        <>
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-500">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="text-sm">Share</span>
        </>
      )}
    </button>
  )
}
