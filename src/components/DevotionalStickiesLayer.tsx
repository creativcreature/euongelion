'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

type StickyAnnotationRow = {
  id: string
  body: string | null
  style: Record<string, unknown> | null
}

type StickyNote = {
  id: string
  body: string
  x: number
  y: number
}

type DragState = {
  id: string
  startClientX: number
  startClientY: number
  startX: number
  startY: number
} | null

const DEFAULT_STICKY_BODY = 'Write a sticky note...'

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parsePosition(
  style: Record<string, unknown> | null,
  fallback: { x: number; y: number },
) {
  const x = Number(style?.x)
  const y = Number(style?.y)
  return {
    x: Number.isFinite(x) ? clamp(x, 0.02, 0.78) : fallback.x,
    y: Number.isFinite(y) ? clamp(y, 0.02, 0.84) : fallback.y,
  }
}

function fallbackPosition(index: number) {
  return {
    x: clamp(0.04 + (index % 3) * 0.24, 0.02, 0.78),
    y: clamp(0.05 + Math.floor(index / 3) * 0.18, 0.02, 0.84),
  }
}

export default function DevotionalStickiesLayer({
  devotionalSlug,
}: {
  devotionalSlug: string
}) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState>(null)
  const notesRef = useRef<StickyNote[]>([])
  const [isDesktop, setIsDesktop] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<StickyNote[]>([])

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.y - b.y || a.x - b.x),
    [notes],
  )

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const markSaving = useCallback((id: string, active: boolean) => {
    setSavingIds((current) => {
      if (active) {
        if (current.includes(id)) return current
        return [...current, id]
      }
      return current.filter((entry) => entry !== id)
    })
  }, [])

  const handleAuthRedirect = useCallback((redirectPath?: string) => {
    if (typeof window === 'undefined') return
    const redirect =
      redirectPath || `${window.location.pathname}${window.location.search}`
    window.location.assign(
      `/auth/sign-in?redirect=${encodeURIComponent(redirect)}`,
    )
  }, [])

  const loadStickies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/annotations?devotionalSlug=${encodeURIComponent(
          devotionalSlug,
        )}&annotationType=sticky`,
        { cache: 'no-store' },
      )
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(payload.error || 'Unable to load stickies.')
      }
      const payload = (await response.json()) as {
        annotations?: StickyAnnotationRow[]
      }
      const rows = Array.isArray(payload.annotations) ? payload.annotations : []
      const mapped = rows.map((row, index) => {
        const fallback = fallbackPosition(index)
        const position = parsePosition(row.style, fallback)
        return {
          id: row.id,
          body:
            String(row.body || DEFAULT_STICKY_BODY).trim() ||
            DEFAULT_STICKY_BODY,
          x: position.x,
          y: position.y,
        }
      })
      setNotes(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stickies.')
    } finally {
      setLoading(false)
    }
  }, [devotionalSlug])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 981px)')
    const syncViewport = () => setIsDesktop(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    void loadStickies()
  }, [isDesktop, loadStickies])

  useEffect(() => {
    function onLibraryUpdated() {
      if (!isDesktop) return
      void loadStickies()
    }
    window.addEventListener('libraryUpdated', onLibraryUpdated)
    return () => window.removeEventListener('libraryUpdated', onLibraryUpdated)
  }, [isDesktop, loadStickies])

  const persistSticky = useCallback(
    async (note: StickyNote) => {
      markSaving(note.id, true)
      setError(null)
      try {
        const response = await fetch('/api/annotations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            annotationId: note.id,
            body: note.body.trim() || DEFAULT_STICKY_BODY,
            style: {
              source: 'reader-sticky',
              kind: 'sticky_note',
              x: Number(note.x.toFixed(4)),
              y: Number(note.y.toFixed(4)),
            },
          }),
        })
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            code?: string
            error?: string
          }
          if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
            handleAuthRedirect()
            return
          }
          throw new Error(payload.error || 'Unable to save sticky.')
        }
        window.dispatchEvent(new CustomEvent('libraryUpdated'))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save sticky.')
      } finally {
        markSaving(note.id, false)
      }
    },
    [handleAuthRedirect, markSaving],
  )

  const addSticky = useCallback(async () => {
    const fallback = fallbackPosition(notes.length)
    setError(null)
    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devotionalSlug,
          annotationType: 'sticky',
          body: DEFAULT_STICKY_BODY,
          style: {
            source: 'reader-sticky',
            kind: 'sticky_note',
            x: fallback.x,
            y: fallback.y,
          },
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string
        error?: string
        annotation?: StickyAnnotationRow
      }
      if (!response.ok) {
        if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
          handleAuthRedirect()
          return
        }
        throw new Error(payload.error || 'Unable to create sticky.')
      }
      if (!payload.annotation?.id) {
        throw new Error('Sticky note was created without an id.')
      }

      setNotes((current) => [
        ...current,
        {
          id: payload.annotation!.id,
          body: DEFAULT_STICKY_BODY,
          x: fallback.x,
          y: fallback.y,
        },
      ])
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create sticky.')
    }
  }, [devotionalSlug, handleAuthRedirect, notes.length])

  const removeSticky = useCallback(
    async (id: string) => {
      setError(null)
      const response = await fetch(
        `/api/annotations?annotationId=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      const payload = (await response.json().catch(() => ({}))) as {
        code?: string
        error?: string
      }
      if (!response.ok) {
        if (payload.code === 'AUTH_REQUIRED_SAVE_STATE') {
          handleAuthRedirect()
          return
        }
        setError(payload.error || 'Unable to delete sticky.')
        return
      }
      setNotes((current) => current.filter((note) => note.id !== id))
      window.dispatchEvent(new CustomEvent('libraryUpdated'))
    },
    [handleAuthRedirect],
  )

  const setNotePosition = useCallback((id: string, x: number, y: number) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === id
          ? {
              ...note,
              x: clamp(x, 0.02, 0.78),
              y: clamp(y, 0.02, 0.84),
            }
          : note,
      ),
    )
  }, [])

  const onPointerDownHandle = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, note: StickyNote) => {
      if (!isDesktop) return
      dragRef.current = {
        id: note.id,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: note.x,
        startY: note.y,
      }
      ;(event.currentTarget as HTMLButtonElement).setPointerCapture?.(
        event.pointerId,
      )
      event.preventDefault()
    },
    [isDesktop],
  )

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current
      const layer = layerRef.current
      if (!drag || !layer) return

      const rect = layer.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const dx = (event.clientX - drag.startClientX) / rect.width
      const dy = (event.clientY - drag.startClientY) / rect.height
      setNotePosition(drag.id, drag.startX + dx, drag.startY + dy)
    }

    function onPointerUp() {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      const note = notesRef.current.find((entry) => entry.id === drag.id)
      if (note) {
        void persistSticky(note)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [persistSticky, setNotePosition])

  if (!isDesktop) return null

  return (
    <div ref={layerRef} className="reader-stickies-layer" aria-label="Stickies">
      <div className="reader-stickies-toolbar">
        <button
          type="button"
          onClick={() => void addSticky()}
          className="text-label vw-small cta-major px-4 py-2"
        >
          ADD STICKY
        </button>
      </div>

      {loading && (
        <p className="reader-stickies-status vw-small text-muted">
          Loading stickies...
        </p>
      )}
      {error && (
        <p className="reader-stickies-status vw-small text-secondary">
          {error}
        </p>
      )}

      {sortedNotes.map((note) => (
        <article
          key={note.id}
          className="reader-sticky-card"
          style={{
            left: `${note.x * 100}%`,
            top: `${note.y * 100}%`,
          }}
        >
          <div className="reader-sticky-card-head">
            <button
              type="button"
              className="reader-sticky-drag text-label"
              onPointerDown={(event) => onPointerDownHandle(event, note)}
              aria-label="Drag sticky note"
              title="Drag sticky"
            >
              DRAG
            </button>
            <button
              type="button"
              className="reader-sticky-delete text-label"
              onClick={() => void removeSticky(note.id)}
              aria-label="Delete sticky note"
              title="Delete sticky"
            >
              DELETE
            </button>
          </div>
          <textarea
            className="reader-sticky-body"
            value={note.body}
            onChange={(event) => {
              const nextBody = event.target.value
              setNotes((current) =>
                current.map((entry) =>
                  entry.id === note.id ? { ...entry, body: nextBody } : entry,
                ),
              )
            }}
            onBlur={() => void persistSticky(note)}
            aria-label="Sticky note text"
          />
          {savingIds.includes(note.id) && (
            <p className="text-label vw-small text-muted">Saving…</p>
          )}
        </article>
      ))}
    </div>
  )
}
