'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from '@/stores/chatStore'

export default function TextHighlightTrigger() {
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
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

  if (!tooltip) return null

  return (
    <button
      className="fixed text-label vw-small border border-[var(--color-text-primary)] bg-gold px-3 py-2 text-tehom transition-opacity duration-200"
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 'var(--z-tooltip)',
        borderRadius: '2px',
      }}
      onClick={() => {
        open(tooltip.text)
        setTooltip(null)
        window.getSelection()?.removeAllRanges()
      }}
    >
      Ask about this
    </button>
  )
}
