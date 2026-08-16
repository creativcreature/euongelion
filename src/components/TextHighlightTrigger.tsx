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

/**
 * Rewrite (or drop) one device-kept highlight, matched on its text.
 *
 * A highlight made without an account has no server id, so editing it has to
 * be handled here or the reader would be able to recolour an account highlight
 * and not a device one — the same control behaving differently depending on
 * something they cannot see.
 */
function mutateLocalHighlight(
  slug: string,
  text: string,
  patch: Partial<LocalHighlight> | null,
) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(LOCAL_HIGHLIGHTS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, LocalHighlight[]>
    const rows = Array.isArray(parsed[slug]) ? parsed[slug] : []
    parsed[slug] = patch
      ? rows.map((row) => (row.text === text ? { ...row, ...patch } : row))
      : rows.filter((row) => row.text !== text)
    window.localStorage.setItem(LOCAL_HIGHLIGHTS_KEY, JSON.stringify(parsed))
  } catch {
    // Same as above: the page already reflects the change.
  }
}

/**
 * Where the toolbar goes relative to the selection.
 *
 * It used to always render ABOVE, clamped to y >= 10 and translated up by its
 * own height — so for anything near the top of the window it rendered off the
 * top of the screen or underneath the sticky masthead, and its controls
 * (Remove especially) could not be reached at all. When there is not enough
 * room above, it flips below the passage instead.
 */
const TOOLBAR_CLEARANCE = 140

function placeToolbar(rect: DOMRect): { y: number; below: boolean } {
  const below = rect.top < TOOLBAR_CLEARANCE
  return {
    y: below ? rect.bottom + 12 : rect.top - 12,
    below,
  }
}

/** Remove a highlight from the page, leaving its text exactly as it was. */
function unwrapMark(mark: HTMLElement) {
  const parent = mark.parentNode
  if (!parent) return
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
  parent.removeChild(mark)
  // Re-join the text nodes the mark split, so a later selection of this
  // passage still matches as one run.
  parent.normalize()
}

function applyHighlightMark(params: {
  range: Range
  color: HighlightColor
  id?: string | null
  note?: string | null
}): HTMLElement | null {
  const mark = document.createElement('mark')
  mark.className = `reader-highlight reader-highlight--${params.color}`
  mark.dataset.highlightColor = params.color
  if (params.id) {
    mark.dataset.highlightId = params.id
  }
  if (params.note) {
    // A note is invisible unless the mark says so — otherwise the reader has
    // to click every highlight to find which one they wrote on.
    mark.dataset.highlightNote = params.note
    mark.setAttribute('title', params.note)
    mark.classList.add('reader-highlight--noted')
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
    below?: boolean
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

  /**
   * Founder, 2026-08-15: "I can highlight text, but not change colors or make
   * notes etc. i am also signed in."
   *
   * Reproduced on production: once a highlight existed it was INERT. Clicking
   * it did nothing and re-selecting it did nothing, because handleSelection
   * returns early for anything inside `.reader-highlight` — a guard that
   * correctly stops nested highlights but left no way in. A scan of every
   * button in the reader found no note, edit or delete control at all.
   *
   * So the colour swatches were never broken; they only ever applied to a NEW
   * selection, and there was no second act. `editing` is that second act: it
   * opens the same toolbar against an existing mark, where the swatches
   * recolour it in place, a note can be attached, and it can be removed.
   *
   * The API needed nothing — PATCH already accepted `style` and `body`, and
   * DELETE already existed. This was a missing surface, not a missing feature.
   */
  const [editing, setEditing] = useState<{
    el: HTMLElement
    id: string | null
    text: string
    color: HighlightColor
    note: string
    x: number
    y: number
    below?: boolean
  } | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')

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

    const placement = placeToolbar(rect)
    setTooltip({ text, x: rect.left + rect.width / 2, ...placement })
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
    }
  }, [handleSelection])

  // Clicking an existing highlight opens it for editing. Delegated from the
  // document so it covers marks painted now and marks hydrated later.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.reader-highlight-toolbar')) return

      const mark = target.closest('mark.reader-highlight')
      if (!(mark instanceof HTMLElement)) {
        setEditing(null)
        setNoteOpen(false)
        return
      }

      const rect = mark.getBoundingClientRect()
      setTooltip(null)
      setFailed(null)
      const color = normalizeHighlightColor(mark.dataset.highlightColor)
      const note = mark.dataset.highlightNote || ''
      setSelectedColor(color)
      setNoteDraft(note)
      setNoteOpen(false)
      setEditing({
        el: mark,
        id: mark.dataset.highlightId || null,
        text: (mark.textContent || '').trim(),
        color,
        note,
        x: rect.left + rect.width / 2,
        ...placeToolbar(rect),
      })
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

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
            note:
              typeof annotation.style?.note === 'string'
                ? annotation.style.note
                : null,
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

  /**
   * Persist a change to an existing highlight.
   *
   * Paints first and reconciles after, for the same reason the create path
   * does (SA-038): the reader's action must land visibly whether or not the
   * network does. A signed-out reader's change is kept on the device instead.
   */
  async function persistEdit(
    next: { color?: HighlightColor; note?: string },
    current: NonNullable<typeof editing>,
  ) {
    const color = next.color ?? current.color
    const note = next.note ?? current.note

    if (!current.id) {
      // Device-kept highlight: localStorage is its only home.
      mutateLocalHighlight(devotionalSlug, current.text, { color })
      return
    }

    try {
      const response = await fetch('/api/annotations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotationId: current.id,
          style: {
            source: 'text-selection',
            kind: 'favorite_verse',
            color,
            note: note || undefined,
          },
        }),
      })
      if (!response.ok) {
        setFailed(
          response.status === 401 ? 'Kept on this device' : "Couldn't save",
        )
        if (response.status === 401) {
          mutateLocalHighlight(devotionalSlug, current.text, { color })
        }
        setTimeout(() => setFailed(null), 1800)
        return
      }
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
    } catch {
      setFailed("Couldn't save")
      setTimeout(() => setFailed(null), 1800)
    }
  }

  function recolorEditing(color: HighlightColor) {
    if (!editing) return
    setSelectedColor(color)
    // Repaint immediately — the swatch is the control and must feel like one.
    editing.el.className = `reader-highlight reader-highlight--${color}`
    editing.el.dataset.highlightColor = color
    setEditing({ ...editing, color })
    void persistEdit({ color }, editing)
  }

  async function saveNote() {
    if (!editing) return
    const note = noteDraft.trim().slice(0, 4000)
    if (note) {
      editing.el.dataset.highlightNote = note
      editing.el.setAttribute('title', note)
    } else {
      delete editing.el.dataset.highlightNote
      editing.el.removeAttribute('title')
    }
    editing.el.classList.toggle('reader-highlight--noted', Boolean(note))
    setEditing({ ...editing, note })
    setNoteOpen(false)
    await persistEdit({ note }, editing)
  }

  async function removeHighlight() {
    if (!editing) return
    const { el, id, text } = editing
    unwrapMark(el)
    setEditing(null)
    setNoteOpen(false)
    mutateLocalHighlight(devotionalSlug, text, null)
    if (!id) return
    try {
      const response = await fetch(
        `/api/annotations?annotationId=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('libraryUpdated'))
      }
    } catch {
      // The mark is already gone from the page; a failed delete would restore
      // it on next load, which is the honest outcome rather than a silent one.
    }
  }

  /**
   * `thenNote` is the founder's "works with the highlight somehow" (SA-061):
   * marking a passage and writing on it is ONE gesture, not two. Without it the
   * reader has to highlight, dismiss the toolbar, find the mark again, click it,
   * and only then reach a note field.
   */
  async function saveFavoriteVerse(options: { thenNote?: boolean } = {}) {
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

      if (options.thenNote) {
        // Reopen the same toolbar against the mark just made, with the note
        // panel already open — the second act, without the hunt for it.
        const rect = mark.getBoundingClientRect()
        setTooltip(null)
        setSaved(false)
        setNoteDraft('')
        setEditing({
          el: mark,
          id: payload.annotation?.id ?? null,
          text: selectedText,
          color: selectedColor,
          note: '',
          x: rect.left + rect.width / 2,
          ...placeToolbar(rect),
        })
        setNoteOpen(true)
        selectionRangeRef.current = null
        selectionTextRef.current = ''
        return
      }

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

  const anchor = editing ?? tooltip
  if (!anchor) return null

  return (
    <div
      className="reader-highlight-toolbar fixed flex flex-col gap-2 border border-[var(--color-text-primary)] bg-page px-2 py-2"
      style={{
        left: `${anchor.x}px`,
        top: `${anchor.y}px`,
        transform: anchor.below
          ? 'translate(-50%, 0)'
          : 'translate(-50%, -100%)',
        zIndex: 'var(--z-tooltip)',
        borderRadius: '2px',
      }}
      // Keep the text selection alive while the toolbar is used. Without this
      // a browser collapses the selection on mousedown, and the create path
      // loses the range it is about to highlight.
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-2">
        <div className="reader-highlight-color-row">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`reader-highlight-swatch reader-highlight-swatch--${color} ${
                selectedColor === color ? 'is-active' : ''
              }`}
              onClick={() =>
                editing ? recolorEditing(color) : setSelectedColor(color)
              }
              aria-label={
                editing
                  ? `Change highlight to ${color}`
                  : `Select ${color} highlight color`
              }
              title={`Highlight color: ${color}`}
            />
          ))}
        </div>

        {editing ? (
          <>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]"
              onClick={() => setNoteOpen((wasOpen) => !wasOpen)}
              aria-expanded={noteOpen}
            >
              {editing.note ? 'Edit note' : 'Note'}
            </button>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-text-primary)] bg-gold px-3 py-2 text-tehom"
              onClick={() => {
                open(editing.text)
                setEditing(null)
              }}
            >
              Ask
            </button>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)]"
              onClick={() => void removeHighlight()}
            >
              {failed ? failed : 'Remove'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-text-primary)] bg-gold px-3 py-2 text-tehom transition-opacity duration-200"
              onClick={() => {
                open(tooltip!.text)
                setTooltip(null)
                window.getSelection()?.removeAllRanges()
              }}
            >
              Ask
            </button>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)] transition-opacity duration-200"
              disabled={saving}
              onClick={() => void saveFavoriteVerse({ thenNote: true })}
            >
              Note
            </button>
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-primary)] transition-opacity duration-200"
              disabled={saving}
              onClick={() => void saveFavoriteVerse()}
            >
              {failed
                ? failed
                : saved
                  ? 'Saved'
                  : saving
                    ? 'Saving'
                    : 'Highlight'}
            </button>
          </>
        )}
      </div>

      {editing && noteOpen && (
        <div className="reader-highlight-note">
          <textarea
            className="reader-highlight-note-input"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Write a note on this passage…"
            rows={3}
            maxLength={4000}
            aria-label="Note on this highlight"
            autoFocus
          />
          <div className="reader-highlight-note-actions">
            <button
              type="button"
              className="text-label vw-small border border-[var(--color-text-primary)] bg-gold px-3 py-1 text-tehom"
              onClick={() => void saveNote()}
            >
              Save note
            </button>
            <button
              type="button"
              className="text-label vw-small px-2 py-1 text-[var(--color-text-primary)] underline"
              onClick={() => {
                setNoteDraft(editing.note)
                setNoteOpen(false)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
