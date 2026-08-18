'use client'

/**
 * Global search overlay — F-071 (site audit P1 #14).
 *
 * One search surface over series, devotionals, and the reader's own
 * notes/bookmarks/clippings. Opened from the masthead search glyphs
 * (desktop utilities row + mobile top bar) and Cmd/Ctrl+K; the
 * homepage SearchAction schema deep-links here via `/?search={query}`.
 *
 * Surface: full-screen sheet on mobile, centered overlay on desktop
 * (see the F-071 block at the end of globals.css). Focus is trapped
 * while open, Escape closes, and focus returns to the opener.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import Link from 'next/link'
import {
  buildNoteItems,
  searchDevotionals,
  searchNotes,
  searchSeries,
  tokenizeQuery,
  type AnnotationApiRecord,
  type BookmarkApiRecord,
  type NoteResultKind,
  type NoteSearchItem,
} from '@/lib/global-search'
import { isClippingsSupported, listClippings } from '@/lib/clippings'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

const SERIES_LIMIT = 5
const DEVOTIONAL_LIMIT = 8
const NOTES_LIMIT = 8

type NotesStatus = 'loading' | 'ready' | 'error'

const NOTE_KIND_LABELS: Record<NoteResultKind, string> = {
  note: 'NOTE',
  highlight: 'HIGHLIGHT',
  sticky: 'STICKY',
  sticker: 'STICKER',
  bookmark: 'BOOKMARK',
  clipping: 'CLIPPING',
}

async function fetchAnnotations(): Promise<AnnotationApiRecord[]> {
  const response = await fetch('/api/annotations', { cache: 'no-store' })
  // Mirror the existing save-state gate (SA-018): a signed-out reader
  // simply has no server-side notes — that is a valid empty group, not
  // an error.
  if (response.status === 401) return []
  if (!response.ok) throw new Error('Annotations request failed.')
  const payload = (await response.json()) as {
    annotations?: AnnotationApiRecord[]
  }
  return payload.annotations ?? []
}

async function fetchBookmarks(): Promise<BookmarkApiRecord[]> {
  const response = await fetch('/api/bookmarks', { cache: 'no-store' })
  if (response.status === 401) return []
  if (!response.ok) throw new Error('Bookmarks request failed.')
  const payload = (await response.json()) as {
    bookmarks?: BookmarkApiRecord[]
  }
  return payload.bookmarks ?? []
}

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    ),
  )
}

/**
 * Recent searches (backlog #45).
 *
 * Every search in the Mobbin scan keeps them — Best Buy, IKEA, GitHub — because
 * the second search for a thing is far more common than the first, and retyping
 * is the cost. Stored in this browser only: the search box is the one place a
 * reader may type something they would not want on a server, and the privacy
 * copy elsewhere on the site now says exactly what is kept where.
 */
/** Real series names, so the empty state teaches the actual corpus rather than
 *  inventing example prose. Three is enough to show the shape of a query. */
const SUGGESTED = SERIES_ORDER.slice(0, 3)
  .map((slug) => SERIES_DATA[slug]?.title)
  .filter((t): t is string => Boolean(t))

const RECENTS_KEY = 'euangelion:search-recents'
const RECENTS_MAX = 6

function readRecents(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .slice(0, RECENTS_MAX)
  } catch {
    return []
  }
}

function writeRecents(list: string[]) {
  try {
    window.localStorage.setItem(
      RECENTS_KEY,
      JSON.stringify(list.slice(0, RECENTS_MAX)),
    )
  } catch {
    // Storage disabled or full. Recents are a convenience, never a requirement.
  }
}

export default function GlobalSearchOverlay({
  open,
  initialQuery = '',
  onClose,
}: {
  open: boolean
  initialQuery?: string
  onClose: () => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [notesStatus, setNotesStatus] = useState<NotesStatus>('loading')
  const [notesPartial, setNotesPartial] = useState(false)
  const [noteItems, setNoteItems] = useState<NoteSearchItem[]>([])
  const [recents, setRecents] = useState<string[]>([])

  const panelRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Render-time state adjustment (the React-sanctioned "adjust state when
  // a prop changes" pattern): each open re-seeds the query and resets the
  // notes machine to loading before the fetch effect runs.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery(initialQuery)
      setNotesStatus('loading')
      setNotesPartial(false)
      setRecents(readRecents())
    }
  }

  // Focus handoff: remember the opener, focus the input. The cleanup
  // returns focus when the overlay closes or unmounts.
  useEffect(() => {
    if (!open) return
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      restoreFocusRef.current?.focus()
      restoreFocusRef.current = null
    }
  }, [open])

  /** Remember a query the reader actually used. */
  const rememberQuery = useCallback((raw: string) => {
    const value = raw.trim()
    if (value.length < 2) return
    const next = [value, ...readRecents().filter((r) => r !== value)].slice(
      0,
      RECENTS_MAX,
    )
    writeRecents(next)
    setRecents(next)
  }, [])

  /** Opening a result is the signal that the query was worth keeping. */
  const commitAndClose = useCallback(() => {
    rememberQuery(query)
    onClose()
  }, [rememberQuery, query, onClose])

  const clearRecents = useCallback(() => {
    writeRecents([])
    setRecents([])
  }, [])

  // Escape closes from anywhere, not just from inside the panel.
  //
  // `handlePanelKeyDown` below already closes on Escape, but it is a React
  // onKeyDown bound to the panel, so it only fires while focus is INSIDE the
  // panel. Normally it is — the effect above focuses the input on open — but
  // that focus lands in a requestAnimationFrame and can lose the race; caught
  // live during the 2026-08-16 sweep with `document.activeElement` still on
  // BODY and Escape doing nothing, leaving the overlay closable only by mouse.
  // This is additive: it cannot break the panel-scoped path, it only covers the
  // case where focus never arrived.
  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  // Scroll lock while open. Providers' defensive unlock re-runs when the
  // tab becomes visible again, so we re-assert on the same signals.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const lock = () => {
      document.body.style.overflow = 'hidden'
    }
    lock()
    const relock = () => {
      if (document.visibilityState === 'visible') lock()
    }
    document.addEventListener('visibilitychange', relock)
    window.addEventListener('pageshow', relock)
    return () => {
      document.removeEventListener('visibilitychange', relock)
      window.removeEventListener('pageshow', relock)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Fetch the reader's marginalia fresh on each open (the loading reset
  // happens in the render-time adjustment above). Failures are surfaced
  // (no silent fallback): if every source fails the group says so; if
  // some fail we show what loaded plus an honest partial notice.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function load() {
      // Clippings are local-first (IndexedDB) and only count as a source
      // when this runtime supports them — capability detection, mirroring
      // ClipButton. Otherwise an unsupported no-op would mask a real API
      // outage as a "partial" load.
      const clippingsSupported = isClippingsSupported()
      const [annotations, bookmarks, clippings] = await Promise.allSettled([
        fetchAnnotations(),
        fetchBookmarks(),
        clippingsSupported ? listClippings() : Promise.resolve([]),
      ])
      if (cancelled) return
      const attempted = clippingsSupported
        ? [annotations, bookmarks, clippings]
        : [annotations, bookmarks]
      const anyRejected = attempted.some(
        (result) => result.status === 'rejected',
      )
      const allRejected = attempted.every(
        (result) => result.status === 'rejected',
      )
      setNoteItems(
        buildNoteItems({
          annotations:
            annotations.status === 'fulfilled' ? annotations.value : [],
          bookmarks: bookmarks.status === 'fulfilled' ? bookmarks.value : [],
          clippings: clippings.status === 'fulfilled' ? clippings.value : [],
        }),
      )
      setNotesPartial(anyRejected && !allRejected)
      setNotesStatus(allRejected ? 'error' : 'ready')
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open])

  const hasQuery = useMemo(() => tokenizeQuery(query).length > 0, [query])
  const seriesResults = useMemo(
    () => (hasQuery ? searchSeries(query) : []),
    [hasQuery, query],
  )
  const devotionalResults = useMemo(
    () => (hasQuery ? searchDevotionals(query) : []),
    [hasQuery, query],
  )
  const noteResults = useMemo(
    () => (hasQuery ? searchNotes(query, noteItems) : []),
    [hasQuery, query, noteItems],
  )

  const getResultNodes = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return []
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('[data-search-result]'),
    )
  }, [])

  const handlePanelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const nodes = getResultNodes()
        if (nodes.length === 0) return
        event.preventDefault()
        const current = nodes.indexOf(document.activeElement as HTMLElement)
        let next: number
        if (event.key === 'ArrowDown') {
          next = current < 0 ? 0 : (current + 1) % nodes.length
        } else if (current <= 0) {
          // ArrowUp from the input (or the first result) wraps to the
          // last result; from the first result it also returns focus to
          // the input first for a natural up-and-out feel.
          next = current === 0 ? -1 : nodes.length - 1
        } else {
          next = current - 1
        }
        if (next === -1) {
          inputRef.current?.focus()
        } else {
          nodes[next]?.focus()
        }
        return
      }
      if (event.key === 'Tab') {
        const focusables = getFocusable(panelRef.current)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    },
    [getResultNodes, onClose],
  )

  const handleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      // Enter opens the top result — the result links close the overlay
      // via their own onClick.
      getResultNodes()[0]?.click()
    },
    [getResultNodes],
  )

  const handleBackdropMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  if (!open) return null

  const seriesShown = seriesResults.slice(0, SERIES_LIMIT)
  const devotionalsShown = devotionalResults.slice(0, DEVOTIONAL_LIMIT)
  const notesShown = noteResults.slice(0, NOTES_LIMIT)
  const notesGroupVisible =
    hasQuery &&
    (notesStatus === 'loading' ||
      notesStatus === 'error' ||
      noteResults.length > 0)
  const nothingMatched =
    hasQuery &&
    seriesResults.length === 0 &&
    devotionalResults.length === 0 &&
    noteResults.length === 0 &&
    notesStatus !== 'loading'

  return (
    <div
      className="global-search-layer"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={panelRef}
        className="global-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Search Euangelion"
        onKeyDown={handlePanelKeyDown}
      >
        <form
          className="global-search-inputrow"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <svg
            className="global-search-glyph"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="global-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search…"
            aria-label="Search series, devotionals, and your notes"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <button
            type="button"
            className="global-search-close text-label"
            onClick={onClose}
            aria-label="Close search"
          >
            {'✕'}
          </button>
        </form>

        <div className="global-search-body">
          {!hasQuery && (
            <div className="global-search-zero">
              <p className="global-search-hint">
                Search series, devotionals, your notes.
              </p>

              {recents.length > 0 && (
                <section
                  className="global-search-zero-group"
                  aria-label="Recent searches"
                >
                  <div className="global-search-zero-head">
                    <h3 className="global-search-group-label text-label">
                      RECENT
                    </h3>
                    <button
                      type="button"
                      className="global-search-zero-clear text-label"
                      onClick={clearRecents}
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="global-search-chips">
                    {recents.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="global-search-chip"
                        onClick={() => {
                          setQuery(term)
                          inputRef.current?.focus()
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {SUGGESTED.length > 0 && (
                <section
                  className="global-search-zero-group"
                  aria-label="Suggested searches"
                >
                  <h3 className="global-search-group-label text-label">TRY</h3>
                  <div className="global-search-chips">
                    {SUGGESTED.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="global-search-chip"
                        onClick={() => {
                          setQuery(term)
                          inputRef.current?.focus()
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {hasQuery && seriesShown.length > 0 && (
            <section
              className="global-search-group"
              aria-label={`Series — ${seriesResults.length} result${seriesResults.length === 1 ? '' : 's'}`}
            >
              <h3 className="global-search-group-label text-label">
                SERIES <span aria-hidden="true">·</span> {seriesResults.length}
              </h3>
              <ul className="global-search-list">
                {seriesShown.map((result) => (
                  <li key={result.slug}>
                    <Link
                      href={result.href}
                      className="global-search-result"
                      data-search-result
                      onClick={commitAndClose}
                    >
                      <span className="global-search-result-title">
                        {result.title}
                      </span>
                      <span className="global-search-result-meta">
                        {result.dayCount} days · {result.question}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {seriesResults.length > seriesShown.length && (
                <p className="global-search-more">
                  + {seriesResults.length - seriesShown.length} more — keep
                  typing to narrow.
                </p>
              )}
            </section>
          )}

          {hasQuery && devotionalsShown.length > 0 && (
            <section
              className="global-search-group"
              aria-label={`Devotionals — ${devotionalResults.length} result${devotionalResults.length === 1 ? '' : 's'}`}
            >
              <h3 className="global-search-group-label text-label">
                DEVOTIONALS <span aria-hidden="true">·</span>{' '}
                {devotionalResults.length}
              </h3>
              <ul className="global-search-list">
                {devotionalsShown.map((result) => (
                  <li key={result.slug}>
                    <Link
                      href={result.href}
                      className="global-search-result"
                      data-search-result
                      onClick={commitAndClose}
                    >
                      <span className="global-search-result-title">
                        {result.title}
                      </span>
                      <span className="global-search-result-meta">
                        {result.seriesTitle ? `${result.seriesTitle} — ` : ''}
                        {result.teaser ?? ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {devotionalResults.length > devotionalsShown.length && (
                <p className="global-search-more">
                  + {devotionalResults.length - devotionalsShown.length} more —
                  keep typing to narrow.
                </p>
              )}
            </section>
          )}

          {notesGroupVisible && (
            <section
              className="global-search-group"
              aria-label={`Your notes — ${noteResults.length} result${noteResults.length === 1 ? '' : 's'}`}
            >
              <h3 className="global-search-group-label text-label">
                YOUR NOTES <span aria-hidden="true">·</span>{' '}
                {notesStatus === 'loading' ? '…' : noteResults.length}
              </h3>
              {notesStatus === 'loading' && (
                <p className="global-search-note-status" role="status">
                  Loading your notes…
                </p>
              )}
              {notesStatus === 'error' && (
                <p className="global-search-note-status" role="alert">
                  Couldn&rsquo;t load your notes right now. Try again in a
                  moment.
                </p>
              )}
              {notesStatus === 'ready' && notesPartial && (
                <p className="global-search-note-status" role="alert">
                  Some of your notes couldn&rsquo;t be loaded — results may be
                  incomplete.
                </p>
              )}
              {notesShown.length > 0 && (
                <ul className="global-search-list">
                  {notesShown.map((result) => (
                    <li key={result.id}>
                      <Link
                        href={result.href}
                        className="global-search-result"
                        data-search-result
                        onClick={commitAndClose}
                      >
                        <span className="global-search-result-title">
                          {result.text || result.label}
                        </span>
                        <span className="global-search-result-meta">
                          <span className="global-search-result-kind">
                            {NOTE_KIND_LABELS[result.kind]}
                          </span>{' '}
                          {result.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {noteResults.length > notesShown.length && (
                <p className="global-search-more">
                  + {noteResults.length - notesShown.length} more — keep typing
                  to narrow.
                </p>
              )}
            </section>
          )}

          {nothingMatched && (
            <div className="global-search-empty">
              <p className="global-search-empty-line">
                Nothing here matched &ldquo;{query.trim()}&rdquo;.
              </p>
              <Link
                href="/soul-audit"
                className="global-search-empty-cta"
                onClick={onClose}
              >
                Not sure what to look for? Tell the Soul Audit one honest
                sentence &rarr;
              </Link>
            </div>
          )}
        </div>

        <p className="global-search-footer text-label" aria-hidden="true">
          ESC TO CLOSE · ⌘K / CTRL+K
        </p>
      </div>
    </div>
  )
}
