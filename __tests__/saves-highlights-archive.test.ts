/**
 * Saves, Highlights, Notes, Margins, and Archive Tests
 *
 * Tests from PLAN-V3 Phase 9 and euan-PLAN-v2 decisions 22-23:
 * - Highlights with multi-color palette (YouVersion-style)
 * - Highlight overlap: recolor existing range
 * - Quick note prompt on highlight + full edit later
 * - Favorite verses (created from highlight action)
 * - Day bookmarks + series bookmarks (distinct entities)
 * - Day bookmarks auto-nest under series
 * - Margin notes (per-day anchored, separate from generic notes)
 * - Exact duplicate prevention
 * - Soft-delete with trash restore
 * - Archive lifecycle: archive → trash → restore / permanent delete
 * - Monthly cleanup CTA for stale content
 * - Library UX: search + sort + filter + group + bulk actions
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple'
type BookmarkKind = 'series' | 'day'
type SaveItemKind =
  | 'highlight'
  | 'favorite_verse'
  | 'bookmark'
  | 'note'
  | 'margin_note'
type ArchiveState = 'active' | 'archived' | 'trashed'
type SortOrder = 'newest' | 'oldest' | 'series' | 'relevance'

interface Highlight {
  id: string
  text: string
  color: HighlightColor
  note: string | null
  seriesSlug: string
  dayNumber: number
  startOffset: number
  endOffset: number
  isFavoriteVerse: boolean
  sourceVerseRef: string | null
  tags: string[]
  smartTopics: string[]
  state: ArchiveState
  createdAt: number
}

interface Bookmark {
  id: string
  kind: BookmarkKind
  seriesSlug: string
  dayNumber: number | null // null for series bookmarks
  tags: string[]
  state: ArchiveState
  createdAt: number
}

interface MarginNote {
  id: string
  seriesSlug: string
  dayNumber: number
  anchorOffset: number
  text: string
  state: ArchiveState
  createdAt: number
}

interface LibraryIndex {
  highlights: Highlight[]
  bookmarks: Bookmark[]
  marginNotes: MarginNote[]
  trashCount: number
}

// ---------------------------------------------------------------------------
// Pure helpers (contract stubs)
// ---------------------------------------------------------------------------

function createHighlight(
  text: string,
  color: HighlightColor,
  seriesSlug: string,
  dayNumber: number,
  startOffset: number,
  endOffset: number,
): Highlight {
  return {
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    color,
    note: null,
    seriesSlug,
    dayNumber,
    startOffset,
    endOffset,
    isFavoriteVerse: false,
    sourceVerseRef: null,
    tags: [],
    smartTopics: [],
    state: 'active',
    createdAt: Date.now(),
  }
}

function recolorHighlight(
  highlight: Highlight,
  newColor: HighlightColor,
): Highlight {
  return { ...highlight, color: newColor }
}

function addQuickNote(highlight: Highlight, note: string): Highlight {
  return { ...highlight, note }
}

function markAsFavoriteVerse(
  highlight: Highlight,
  verseRef: string,
): Highlight {
  return { ...highlight, isFavoriteVerse: true, sourceVerseRef: verseRef }
}

function createBookmark(
  kind: BookmarkKind,
  seriesSlug: string,
  dayNumber: number | null,
): Bookmark {
  if (kind === 'day' && dayNumber === null)
    throw new Error('Day bookmarks require dayNumber')
  return {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    seriesSlug,
    dayNumber,
    tags: [],
    state: 'active',
    createdAt: Date.now(),
  }
}

function createMarginNote(
  seriesSlug: string,
  dayNumber: number,
  anchorOffset: number,
  text: string,
): MarginNote {
  return {
    id: `mn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seriesSlug,
    dayNumber,
    anchorOffset,
    text,
    state: 'active',
    createdAt: Date.now(),
  }
}

function isDuplicate<
  T extends { seriesSlug: string; dayNumber: number | null },
>(items: T[], candidate: T, matchFields: (keyof T)[]): boolean {
  return items.some((item) =>
    matchFields.every((f) => item[f] === candidate[f]),
  )
}

function softDelete<T extends { state: ArchiveState }>(item: T): T {
  return { ...item, state: 'trashed' }
}

function restore<T extends { state: ArchiveState }>(item: T): T {
  if (item.state !== 'trashed')
    throw new Error('Can only restore trashed items')
  return { ...item, state: 'active' }
}

function archiveItem<T extends { state: ArchiveState }>(item: T): T {
  return { ...item, state: 'archived' }
}

function permanentDelete<T extends { state: ArchiveState }>(item: T): T | null {
  if (item.state !== 'trashed')
    throw new Error('Can only permanently delete trashed items')
  return null
}

function dayBookmarksNestUnderSeries(
  bookmarks: Bookmark[],
): Map<string, Bookmark[]> {
  const grouped = new Map<string, Bookmark[]>()
  for (const bm of bookmarks) {
    const existing = grouped.get(bm.seriesSlug) ?? []
    grouped.set(bm.seriesSlug, [...existing, bm])
  }
  return grouped
}

function filterLibrary(
  index: LibraryIndex,
  filter: { kind?: SaveItemKind; state?: ArchiveState; seriesSlug?: string },
): (Highlight | Bookmark | MarginNote)[] {
  const results: (Highlight | Bookmark | MarginNote)[] = []

  if (
    !filter.kind ||
    filter.kind === 'highlight' ||
    filter.kind === 'favorite_verse'
  ) {
    let hls = index.highlights
    if (filter.state) hls = hls.filter((h) => h.state === filter.state)
    if (filter.seriesSlug)
      hls = hls.filter((h) => h.seriesSlug === filter.seriesSlug)
    if (filter.kind === 'favorite_verse')
      hls = hls.filter((h) => h.isFavoriteVerse)
    results.push(...hls)
  }

  if (!filter.kind || filter.kind === 'bookmark') {
    let bms = index.bookmarks
    if (filter.state) bms = bms.filter((b) => b.state === filter.state)
    if (filter.seriesSlug)
      bms = bms.filter((b) => b.seriesSlug === filter.seriesSlug)
    results.push(...bms)
  }

  if (!filter.kind || filter.kind === 'margin_note') {
    let mns = index.marginNotes
    if (filter.state) mns = mns.filter((m) => m.state === filter.state)
    if (filter.seriesSlug)
      mns = mns.filter((m) => m.seriesSlug === filter.seriesSlug)
    results.push(...mns)
  }

  return results
}

function sortItems<T extends { createdAt: number; seriesSlug?: string }>(
  items: T[],
  order: SortOrder,
): T[] {
  const sorted = [...items]
  switch (order) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt)
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt)
    case 'series':
      return sorted.sort((a, b) =>
        (a.seriesSlug ?? '').localeCompare(b.seriesSlug ?? ''),
      )
    default:
      return sorted
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Highlights', () => {
  it('creates a highlight with default color', () => {
    const hl = createHighlight('God is love', 'yellow', 'identity', 1, 0, 11)
    expect(hl.text).toBe('God is love')
    expect(hl.color).toBe('yellow')
    expect(hl.note).toBeNull()
    expect(hl.state).toBe('active')
  })

  it('supports multi-color palette', () => {
    const colors: HighlightColor[] = [
      'yellow',
      'blue',
      'green',
      'pink',
      'purple',
    ]
    for (const color of colors) {
      const hl = createHighlight('text', color, 'identity', 1, 0, 4)
      expect(hl.color).toBe(color)
    }
  })

  it('recolors existing highlight (overlap behavior)', () => {
    const hl = createHighlight('God is love', 'yellow', 'identity', 1, 0, 11)
    const recolored = recolorHighlight(hl, 'blue')
    expect(recolored.color).toBe('blue')
    expect(recolored.id).toBe(hl.id) // same highlight, not a new one
  })

  it('adds quick note on creation', () => {
    const hl = createHighlight('Be still', 'green', 'peace', 2, 10, 18)
    const noted = addQuickNote(hl, 'This spoke to me')
    expect(noted.note).toBe('This spoke to me')
  })

  it('quick note can be edited later', () => {
    const hl = createHighlight('Be still', 'green', 'peace', 2, 10, 18)
    const noted = addQuickNote(hl, 'Initial thought')
    const edited = addQuickNote(noted, 'Revised deeper thought')
    expect(edited.note).toBe('Revised deeper thought')
  })

  it('tracks start and end offsets for positioning', () => {
    const hl = createHighlight('God is love', 'yellow', 'identity', 1, 42, 53)
    expect(hl.startOffset).toBe(42)
    expect(hl.endOffset).toBe(53)
  })
})

describe('Favorite verses', () => {
  it('creates favorite from highlight', () => {
    const hl = createHighlight(
      'For God so loved',
      'yellow',
      'why-jesus',
      1,
      0,
      16,
    )
    const fav = markAsFavoriteVerse(hl, 'John 3:16')
    expect(fav.isFavoriteVerse).toBe(true)
    expect(fav.sourceVerseRef).toBe('John 3:16')
  })

  it('favorite verse retains highlight data', () => {
    const hl = createHighlight('Be still and know', 'blue', 'peace', 3, 0, 17)
    const fav = markAsFavoriteVerse(hl, 'Psalm 46:10')
    expect(fav.text).toBe('Be still and know')
    expect(fav.color).toBe('blue')
    expect(fav.seriesSlug).toBe('peace')
  })
})

describe('Bookmarks', () => {
  it('creates a series bookmark', () => {
    const bm = createBookmark('series', 'identity', null)
    expect(bm.kind).toBe('series')
    expect(bm.dayNumber).toBeNull()
  })

  it('creates a day bookmark', () => {
    const bm = createBookmark('day', 'identity', 3)
    expect(bm.kind).toBe('day')
    expect(bm.dayNumber).toBe(3)
  })

  it('rejects day bookmark without day number', () => {
    expect(() => createBookmark('day', 'identity', null)).toThrow(
      'Day bookmarks require dayNumber',
    )
  })

  it('day bookmarks auto-nest under series', () => {
    const bookmarks = [
      createBookmark('day', 'identity', 1),
      createBookmark('day', 'identity', 3),
      createBookmark('day', 'peace', 2),
      createBookmark('series', 'identity', null),
    ]
    const grouped = dayBookmarksNestUnderSeries(bookmarks)
    expect(grouped.get('identity')).toHaveLength(3) // 2 day + 1 series
    expect(grouped.get('peace')).toHaveLength(1)
  })
})

describe('Margin notes', () => {
  it('creates a per-day anchored margin note', () => {
    const mn = createMarginNote(
      'identity',
      3,
      150,
      'Lord, help me see myself clearly',
    )
    expect(mn.seriesSlug).toBe('identity')
    expect(mn.dayNumber).toBe(3)
    expect(mn.anchorOffset).toBe(150)
    expect(mn.text).toBe('Lord, help me see myself clearly')
    expect(mn.state).toBe('active')
  })

  it('margin notes are distinct from highlight notes', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 3, 0, 4)
    const noted = addQuickNote(hl, 'Highlight note')
    const mn = createMarginNote('identity', 3, 0, 'Margin note')

    // Different entity types entirely
    expect('startOffset' in noted).toBe(true) // highlight has offsets
    expect('anchorOffset' in mn).toBe(true) // margin note has anchor
    expect(noted.note).not.toBe(mn.text)
  })
})

describe('Duplicate prevention', () => {
  it('detects exact duplicate highlights', () => {
    const hl1 = createHighlight('God is love', 'yellow', 'identity', 1, 0, 11)
    const hl2 = createHighlight('God is love', 'yellow', 'identity', 1, 0, 11)
    const items = [hl1]
    expect(
      isDuplicate(items, hl2, [
        'seriesSlug',
        'dayNumber',
        'startOffset',
        'endOffset',
      ]),
    ).toBe(true)
  })

  it('allows different text ranges in same day', () => {
    const hl1 = createHighlight('God is love', 'yellow', 'identity', 1, 0, 11)
    const hl2 = createHighlight('Be still', 'blue', 'identity', 1, 20, 28)
    const items = [hl1]
    expect(
      isDuplicate(items, hl2, [
        'seriesSlug',
        'dayNumber',
        'startOffset',
        'endOffset',
      ]),
    ).toBe(false)
  })

  it('detects duplicate series bookmarks', () => {
    const bm1 = createBookmark('series', 'identity', null)
    const bm2 = createBookmark('series', 'identity', null)
    const items = [bm1]
    expect(isDuplicate(items, bm2, ['seriesSlug', 'kind'])).toBe(true)
  })

  it('allows same series different day bookmarks', () => {
    const bm1 = createBookmark('day', 'identity', 1)
    const bm2 = createBookmark('day', 'identity', 3)
    const items = [bm1]
    expect(isDuplicate(items, bm2, ['seriesSlug', 'dayNumber'])).toBe(false)
  })
})

describe('Archive lifecycle', () => {
  it('soft-deletes to trash', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    const trashed = softDelete(hl)
    expect(trashed.state).toBe('trashed')
  })

  it('restores from trash to active', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    const trashed = softDelete(hl)
    const restored = restore(trashed)
    expect(restored.state).toBe('active')
  })

  it('rejects restore of non-trashed items', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    expect(() => restore(hl)).toThrow('Can only restore trashed items')
  })

  it('archives item', () => {
    const bm = createBookmark('series', 'identity', null)
    const archived = archiveItem(bm)
    expect(archived.state).toBe('archived')
  })

  it('permanently deletes only from trash', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    expect(() => permanentDelete(hl)).toThrow(
      'Can only permanently delete trashed items',
    )
  })

  it('permanent delete returns null', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    const trashed = softDelete(hl)
    expect(permanentDelete(trashed)).toBeNull()
  })

  it('archive lifecycle: active → archived → trashed → restored', () => {
    let hl: Highlight | null = createHighlight(
      'text',
      'yellow',
      'identity',
      1,
      0,
      4,
    )
    hl = archiveItem(hl)
    expect(hl.state).toBe('archived')
    hl = softDelete(hl)
    expect(hl.state).toBe('trashed')
    hl = restore(hl)
    expect(hl.state).toBe('active')
  })

  it('archive lifecycle: active → trashed → permanently deleted', () => {
    let hl: Highlight | null = createHighlight(
      'text',
      'yellow',
      'identity',
      1,
      0,
      4,
    )
    hl = softDelete(hl)
    hl = permanentDelete(hl)
    expect(hl).toBeNull()
  })
})

describe('Library filtering and sorting', () => {
  let index: LibraryIndex

  beforeEach(() => {
    const hl1 = {
      ...createHighlight('text1', 'yellow', 'identity', 1, 0, 5),
      createdAt: 1000,
    }
    const hl2 = {
      ...createHighlight('verse', 'blue', 'peace', 2, 0, 5),
      isFavoriteVerse: true,
      sourceVerseRef: 'John 3:16',
      createdAt: 2000,
    }
    const hl3 = {
      ...createHighlight('old', 'green', 'identity', 3, 0, 3),
      state: 'trashed' as ArchiveState,
      createdAt: 500,
    }
    const bm1 = {
      ...createBookmark('series', 'identity', null),
      createdAt: 1500,
    }
    const bm2 = { ...createBookmark('day', 'peace', 1), createdAt: 3000 }
    const mn1 = {
      ...createMarginNote('identity', 1, 10, 'note text'),
      createdAt: 2500,
    }

    index = {
      highlights: [hl1, hl2, hl3],
      bookmarks: [bm1, bm2],
      marginNotes: [mn1],
      trashCount: 1,
    }
  })

  it('filters by kind: highlights only', () => {
    const results = filterLibrary(index, { kind: 'highlight' })
    expect(results.length).toBe(3) // includes trashed
  })

  it('filters by kind: favorite verses only', () => {
    const results = filterLibrary(index, { kind: 'favorite_verse' })
    expect(results.length).toBe(1)
  })

  it('filters by state: active only', () => {
    const results = filterLibrary(index, { state: 'active' })
    // hl1, hl2 (active), bm1, bm2 (active), mn1 (active) = 5
    expect(results.length).toBe(5)
  })

  it('filters by state: trashed only', () => {
    const results = filterLibrary(index, { state: 'trashed' })
    expect(results.length).toBe(1) // hl3
  })

  it('filters by series', () => {
    const results = filterLibrary(index, { seriesSlug: 'identity' })
    // hl1, hl3 (identity highlights), bm1 (identity bookmark), mn1 (identity margin) = 4
    expect(results.length).toBe(4)
  })

  it('sorts newest first (default)', () => {
    const items = [
      { createdAt: 1000, seriesSlug: 'a' },
      { createdAt: 3000, seriesSlug: 'b' },
      { createdAt: 2000, seriesSlug: 'c' },
    ]
    const sorted = sortItems(items, 'newest')
    expect(sorted[0].createdAt).toBe(3000)
    expect(sorted[2].createdAt).toBe(1000)
  })

  it('sorts oldest first', () => {
    const items = [
      { createdAt: 3000, seriesSlug: 'a' },
      { createdAt: 1000, seriesSlug: 'b' },
    ]
    const sorted = sortItems(items, 'oldest')
    expect(sorted[0].createdAt).toBe(1000)
  })

  it('groups by series', () => {
    const items = [
      { createdAt: 1000, seriesSlug: 'peace' },
      { createdAt: 2000, seriesSlug: 'identity' },
      { createdAt: 3000, seriesSlug: 'peace' },
    ]
    const sorted = sortItems(items, 'series')
    expect(sorted[0].seriesSlug).toBe('identity')
    expect(sorted[1].seriesSlug).toBe('peace')
  })
})

describe('Bulk actions', () => {
  it('bulk archive multiple items', () => {
    const items = [
      createHighlight('a', 'yellow', 'identity', 1, 0, 1),
      createHighlight('b', 'blue', 'identity', 2, 0, 1),
      createHighlight('c', 'green', 'peace', 1, 0, 1),
    ]
    const archived = items.map(archiveItem)
    expect(archived.every((i) => i.state === 'archived')).toBe(true)
  })

  it('bulk delete moves to trash', () => {
    const items = [
      createBookmark('series', 'identity', null),
      createBookmark('day', 'peace', 1),
    ]
    const trashed = items.map(softDelete)
    expect(trashed.every((i) => i.state === 'trashed')).toBe(true)
  })

  it('bulk restore from trash', () => {
    const items = [
      softDelete(createHighlight('a', 'yellow', 'identity', 1, 0, 1)),
      softDelete(createHighlight('b', 'blue', 'peace', 1, 0, 1)),
    ]
    const restored = items.map(restore)
    expect(restored.every((i) => i.state === 'active')).toBe(true)
  })
})

describe('Smart topics', () => {
  it('highlights can have auto-generated smart topics', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    const withTopics = { ...hl, smartTopics: ['grace', 'identity', 'prayer'] }
    expect(withTopics.smartTopics).toHaveLength(3)
  })

  it('smart topics are user-editable', () => {
    const hl = createHighlight('text', 'yellow', 'identity', 1, 0, 4)
    const withTopics = { ...hl, smartTopics: ['grace', 'identity'] }
    const edited = { ...withTopics, smartTopics: ['grace', 'forgiveness'] }
    expect(edited.smartTopics).toContain('forgiveness')
    expect(edited.smartTopics).not.toContain('identity')
  })
})
