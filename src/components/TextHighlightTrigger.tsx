'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'

type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple'

type HighlightAnnotationRow = {
  id: string
  anchor_text: string | null
  body: string | null
  style: Record<string, unknown> | null
}

const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'blue',
  'green',
  'pink',
  'purple',
]

const DEFAULT_COLOR: HighlightColor = 'yellow'

function normalizeHighlightColor(value: unknown): HighlightColor {
  const candidate = String(value || '')
    .trim()
    .toLowerCase()
  return HIGHLIGHT_COLORS.includes(candidate as HighlightColor)
    ? (candidate as HighlightColor)
    : DEFAULT_COLOR
}

function buildSearchCandidates(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const shortPrefix = cleaned.slice(0, 120).trim()
  const phrasePrefix = cleaned.split(/\s+/).slice(0, 10).join(' ').trim()

  return Array.from(new Set([cleaned, shortPrefix, phrasePrefix])).filter(
    (candidate) => candidate.length >= 5,
  )
}

function findRangeForSnippet(root: HTMLElement, snippet: string): Range | null {
  const candidates = buildSearchCandidates(snippet)
  if (!candidates.length) return null

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent || ''
      if (!text.trim()) return NodeFilter.FILTER_REJECT
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (
        parent.closest('.reader-highlight') ||
        parent.closest('.reader-highlight-toolbar')
      ) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const segments: Array<{
    node: Text
    start: number
    end: number
  }> = []
  let fullText = ''
  let current = walker.nextNode()
  while (current) {
    const textNode = current as Text
    const textValue = textNode.textContent || ''
    segments.push({
      node: textNode,
      start: fullText.length,
      end: fullText.length + textValue.length,
    })
    fullText += textValue
    current = walker.nextNode()
  }

  if (!segments.length || !fullText) return null

  for (const candidate of candidates) {
    const startIndex = fullText.indexOf(candidate)
    if (startIndex < 0) continue
    const endIndex = startIndex + candidate.length

    const startSegment = segments.find(
      (segment) => startIndex >= segment.start && startIndex < segment.end,
    )
    const endSegment = segments.find(
      (segment) => endIndex > segment.start && endIndex <= segment.end,
    )

    if (!startSegment || !endSegment) continue

    const startOffset = startIndex - startSegment.start
    const endOffset = endIndex - endSegment.start
    if (endOffset <= startOffset && startSegment.node === endSegment.node) {
      continue
    }

    const range = document.createRange()
    range.setStart(startSegment.node, startOffset)
    range.setEnd(endSegment.node, endOffset)
    if (range.collapsed) continue
    return range
  }

  return null
}

/**
 * SA-039: a highlight made without an account is kept on the device rather
 * than lost on reload. It is NOT written to the database — SA-038 draws the
 * line at persistence-to-an-account, and this respects it. Same shape the
 * server returns, so hydration treats both identically.
 */
const LOCAL_HIGHLIGHTS_KEY = 'euangelion-local-highlights-v1'

type LocalHighlight = { text: string; color: HighlightColor; at: string }

function readLocalHighlights(slug: string): LocalHighlight[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, LocalHighlight[]>
    const rows = parsed?.[slug]
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function writeLocalHighlight(slug: string, entry: LocalHighlight) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(LOCAL_HIGHLIGHTS_KEY)
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, LocalHighlight[]>)
      : {}
    const rows = Array.isArray(parsed[slug]) ? parsed[slug] : []
    if (rows.some((r) => r.text === entry.text)) return
    parsed[slug] = [...rows, entry]
    window.localStorage.setItem(LOCAL_HIGHLIGHTS_KEY, JSON.stringify(parsed))
  } catch {
    // Storage full or blocked (private mode). The highlight is still on the
    // page for this session; nothing is silently reported as kept.
  }
}

function applyHighlightMark(params: {
  range: Range
  color: HighlightColor
  id?: string | null
}): HTMLElement | null {
  const mark = document.createElement('mark')
  mark.className = `reader-highlight reader-highlight--${params.color}`
  mark.dataset.highlightColor = params.color
  if (params.id) {
    mark.dataset.highlightId = params.id
  }

  try {
    params.range.surroundContents(mark)
  } catch {
    try {
      const fragment = params.range.extractContents()
      mark.appendChild(fragment)
      params.range.insertNode(mark)
    } catch {
      return null
    }
  }
  // A mark that wrapped nothing is invisible and worse than no mark at all.
  return mark.textContent ? mark : null
}

export default function TextHighlightTrigger({
  devotionalSlug,
}: {
  devotionalSlug: string
}) {
  const selectionRangeRef = useRef<Range | null>(null)
  const selectionTextRef = useRef<string>('')
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [selectedColor, setSelectedColor] =
    useState<HighlightColor>(DEFAULT_COLOR)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // A highlight that fails to save used to return silently, so the reader
  // picked a colour, pressed Highlight, and nothing happened anywhere — no
  // mark, no message. Failures are surfaced now (no silent fallbacks).
  const [failed, setFailed] = useState<string | null>(null)
  const { open } = useChatStore()

  const handleSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      selectionRangeRef.current = null
      selectionTextRef.current = ''
      setTooltip(null)
      return
    }

    const anchorElement =
      selection.anchorNode instanceof Element
        ? selection.anchorNode
        : selection.anchorNode?.parentElement
    if (!anchorElement) {
      selectionRangeRef.current = null
      selectionTextRef.current = ''
      setTooltip(null)
      return
    }

    if (
      anchorElement.closest('.reader-highlight-toolbar') ||
      anchorElement.closest('.reader-highlight')
    ) {
      return
    }

    const text = selection.toString().replace(/\s+/g, ' ').trim()
    if (text.length < 5 || text.length > 500) {
      selectionRangeRef.current = null
      selectionTextRef.current = ''
      setTooltip(null)
      return
    }

    const range = selection.getRangeAt(0).cloneRange()
    const root = document.getElementById('main-content')
    if (!root || !root.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = null
      selectionTextRef.current = ''
      setTooltip(null)
      return
    }

    selectionRangeRef.current = range
    selectionTextRef.current = text

    const rect = range.getBoundingClientRect()
    if (!rect.width && !rect.height) {
      setTooltip(null)
      return
    }

    setTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: Math.max(10, rect.top - 12),
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

  useEffect(() => {
    let cancelled = false

    async function hydrateSavedHighlights() {
      try {
        const root = document.getElementById('main-content')
        if (!root) return

        const response = await fetch(
          `/api/annotations?devotionalSlug=${encodeURIComponent(
            devotionalSlug,
          )}&annotationType=highlight`,
          { cache: 'no-store' },
        )
        if (!response.ok || cancelled) return

        const payload = (await response.json()) as {
          annotations?: HighlightAnnotationRow[]
        }
        const annotations = Array.isArray(payload.annotations)
          ? payload.annotations
          : []

        for (const annotation of annotations) {
          if (cancelled) return
          const snippet = String(
            annotation.anchor_text || annotation.body || '',
          ).trim()
          if (!snippet) continue
          const range = findRangeForSnippet(root, snippet)
          if (!range) continue

          applyHighlightMark({
            range,
            color: normalizeHighlightColor(annotation.style?.color),
            id: annotation.id,
          })
        }
      } catch {
        // Non-fatal: devotional remains readable without hydration.
      } finally {
        // Device-kept highlights (made without an account) restore the same
        // way. Applied after the server rows so a since-signed-in reader does
        // not get the same passage marked twice.
        if (cancelled) return
        const root = document.getElementById('main-content')
        if (!root) return
        for (const local of readLocalHighlights(devotionalSlug)) {
          const snippet = String(local.text || '').trim()
          if (!snippet) continue
          if (root.querySelector('mark.reader-highlight')) {
            const already = [
              ...root.querySelectorAll('mark.reader-highlight'),
            ].some((m) => (m.textContent || '').trim() === snippet)
            if (already) continue
          }
          const range = findRangeForSnippet(root, snippet)
          if (!range) continue
          applyHighlightMark({
            range,
            color: normalizeHighlightColor(local.color),
            id: null,
          })
        }
      }
    }

    void hydrateSavedHighlights()
    return () => {
      cancelled = true
    }
  }, [devotionalSlug])

  // Dismiss tooltip on scroll
  useEffect(() => {
    const dismiss = () => {
      setTooltip(null)
      selectionRangeRef.current = null
      selectionTextRef.current = ''
    }
    window.addEventListener('scroll', dismiss, { passive: true })
    return () => window.removeEventListener('scroll', dismiss)
  }, [])

  async function saveFavoriteVerse() {
    if (!tooltip || saving) return

    const range = selectionRangeRef.current?.cloneRange() || null
    const selectedText = selectionTextRef.current || tooltip.text
    if (!range || !selectedText) {
      // Used to close the toolbar and say nothing. The stored range is cleared
      // by the scroll handler, so this fires in ordinary use.
      setFailed('Select the text again')
      return
    }

    // Founder ruling 2026-08-14: highlighting works with or without an account
    // — an account only decides whether it is *kept*. So the mark is painted
    // first, from the selection, and never waits on the network. Previously it
    // was applied only after response.ok, which meant any failure produced no
    // highlight and no message at all.
    const mark = applyHighlightMark({ range, color: selectedColor, id: null })
    if (!mark) {
      setFailed("Couldn't highlight that selection")
      return
    }
    window.getSelection()?.removeAllRanges()

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
          anchorText: selectedText,
          body: selectedText,
          style: {
            source: 'text-selection',
            kind: 'favorite_verse',
            color: selectedColor,
          },
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string
        annotation?: { id?: string }
      }
      if (!response.ok) {
        // The highlight is already on the page and stays there. Signed-out
        // readers are told it won't be kept rather than being thrown out to
        // a sign-in screen mid-reading; SA-018 still governs what persists.
        if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
          writeLocalHighlight(devotionalSlug, {
            text: selectedText,
            color: selectedColor,
            at: new Date().toISOString(),
          })
        }
        setFailed(
          payload.code === 'AUTH_REQUIRED_SAVE_STATE'
            ? 'Kept on this device'
            : "Highlighted — couldn't save",
        )
        setTimeout(() => {
          setFailed(null)
          setTooltip(null)
          selectionRangeRef.current = null
          selectionTextRef.current = ''
        }, 1800)
        return
      }
      setFailed(null)

      if (payload.annotation?.id) {
        mark.dataset.highlightId = payload.annotation.id
      }
      setSaved(true)
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
      setTimeout(() => {
        setTooltip(null)
        setSaved(false)
        selectionRangeRef.current = null
        selectionTextRef.current = ''
      }, 700)
    } finally {
      setSaving(false)
    }
  }

  if (!tooltip) return null

  return (
    <div
      className="reader-highlight-toolbar fixed flex items-center gap-2 border border-[var(--color-text-primary)] bg-page px-2 py-2"
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 'var(--z-tooltip)',
        borderRadius: '2px',
      }}
    >
      <div className="reader-highlight-color-row">
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`reader-highlight-swatch reader-highlight-swatch--${color} ${
              selectedColor === color ? 'is-active' : ''
            }`}
            onClick={() => setSelectedColor(color)}
            aria-label={`Select ${color} highlight color`}
            title={`Highlight color: ${color}`}
          />
        ))}
      </div>
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
        {failed ? failed : saved ? 'Saved' : saving ? 'Saving' : 'Highlight'}
      </button>
    </div>
  )
}
