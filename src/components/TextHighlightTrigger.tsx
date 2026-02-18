'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from '@/stores/chatStore'

export default function TextHighlightTrigger({
  devotionalSlug,
}: {
  devotionalSlug: string
}) {
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { open } = useChatStore()

  const handleSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setTooltip(null)
      return
    }

    const text = selection.toString().trim()
    if (text.length < 5 || text.length > 500) {
      setTooltip(null)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
    }
  }, [handleSelection])

  // Dismiss tooltip on scroll
  useEffect(() => {
    const dismiss = () => setTooltip(null)
    window.addEventListener('scroll', dismiss, { passive: true })
    return () => window.removeEventListener('scroll', dismiss)
  }, [])

  async function saveFavoriteVerse() {
    if (!tooltip || saving) return
    setSaving(true)
    setSaved(false)
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devotionalSlug,
          annotationType: 'highlight',
          anchorText: tooltip.text,
          body: tooltip.text,
          style: {
            source: 'text-selection',
            kind: 'favorite_verse',
          },
        }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          code?: string
        }
        if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
          const redirect = `${window.location.pathname}${window.location.search}`
          window.location.assign(
            `/auth/sign-in?redirect=${encodeURIComponent(redirect)}`,
          )
        }
        return
      }
      setSaved(true)
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
      setTimeout(() => {
        setTooltip(null)
        setSaved(false)
      }, 700)
    } finally {
      setSaving(false)
    }
  }

  if (!tooltip) return null

  return (
    <div
      className="fixed flex items-center gap-2 border border-[var(--color-text-primary)] bg-page px-2 py-2"
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 'var(--z-tooltip)',
        borderRadius: '2px',
      }}
    >
      <button
        className="text-label vw-small border border-[var(--color-text-primary)] bg-gold px-3 py-2 text-tehom transition-opacity duration-200"
        onClick={() => {
          open(tooltip.text)
          setTooltip(null)
          window.getSelection()?.removeAllRanges()
        }}
      >
        Ask
      </button>
      <button
        className="text-label vw-small border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)] transition-opacity duration-200"
        disabled={saving}
        onClick={() => void saveFavoriteVerse()}
      >
        {saved ? 'Saved' : saving ? 'Saving' : 'Save Verse'}
      </button>
    </div>
  )
}
