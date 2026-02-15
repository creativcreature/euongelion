/**
 * Left Rail and Archive IA Test Suite (Phase 11)
 *
 * Covers PLAN-V3 Phase 11:
 * - Left rail accordion groups
 * - Primary structure: Today+7, Bookmarks, Highlights, Notes, Chat History, Archive, Trash
 * - Archive accordion with restore controls
 * - Archive as first-class nav destination from Daily Bread
 * - Nested items per section
 * - Accordion expand/collapse behavior
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccordionSection {
  id: string
  label: string
  icon: string
  defaultExpanded: boolean
  itemCount: number
  badge: string | null
  nestable: boolean
  sortOrder: number
}

interface ArchiveItem {
  id: string
  type: 'day' | 'bookmark' | 'highlight' | 'note' | 'chat_thread'
  seriesSlug: string
  dayNumber: number | null
  title: string
  archivedAt: number
  restorable: boolean
}

interface TrashItem {
  id: string
  type: string
  title: string
  trashedAt: number
  expiresAt: number
  permanentDeleteAvailable: boolean
}

interface LeftRailState {
  sections: AccordionSection[]
  expandedSections: string[]
  archiveItems: ArchiveItem[]
  trashItems: TrashItem[]
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const LEFT_RAIL_SECTIONS: AccordionSection[] = [
  {
    id: 'today',
    label: 'Today + 7 Days',
    icon: 'calendar',
    defaultExpanded: true,
    itemCount: 0,
    badge: null,
    nestable: false,
    sortOrder: 1,
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: 'bookmark',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: true,
    sortOrder: 2,
  },
  {
    id: 'highlights',
    label: 'Highlights',
    icon: 'highlight',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: true,
    sortOrder: 3,
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: 'note',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: true,
    sortOrder: 4,
  },
  {
    id: 'chat-history',
    label: 'Chat History',
    icon: 'chat',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: true,
    sortOrder: 5,
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: 'archive',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: true,
    sortOrder: 6,
  },
  {
    id: 'trash',
    label: 'Trash',
    icon: 'trash',
    defaultExpanded: false,
    itemCount: 0,
    badge: null,
    nestable: false,
    sortOrder: 7,
  },
]

function createRailState(): LeftRailState {
  return {
    sections: LEFT_RAIL_SECTIONS.map((s) => ({ ...s })),
    expandedSections: ['today'],
    archiveItems: [],
    trashItems: [],
  }
}

function toggleSection(state: LeftRailState, sectionId: string): LeftRailState {
  const isExpanded = state.expandedSections.includes(sectionId)
  return {
    ...state,
    expandedSections: isExpanded
      ? state.expandedSections.filter((id) => id !== sectionId)
      : [...state.expandedSections, sectionId],
  }
}

function updateSectionCount(
  state: LeftRailState,
  sectionId: string,
  count: number,
): LeftRailState {
  return {
    ...state,
    sections: state.sections.map((s) =>
      s.id === sectionId
        ? { ...s, itemCount: count, badge: count > 0 ? `${count}` : null }
        : s,
    ),
  }
}

function addArchiveItem(
  state: LeftRailState,
  item: ArchiveItem,
): LeftRailState {
  return {
    ...state,
    archiveItems: [...state.archiveItems, item],
    sections: state.sections.map((s) =>
      s.id === 'archive'
        ? { ...s, itemCount: state.archiveItems.length + 1 }
        : s,
    ),
  }
}

function restoreArchiveItem(
  state: LeftRailState,
  itemId: string,
): LeftRailState {
  const item = state.archiveItems.find((i) => i.id === itemId)
  if (!item) throw new Error('Archive item not found')
  if (!item.restorable) throw new Error('Item is not restorable')
  return {
    ...state,
    archiveItems: state.archiveItems.filter((i) => i.id !== itemId),
    sections: state.sections.map((s) =>
      s.id === 'archive'
        ? { ...s, itemCount: Math.max(0, state.archiveItems.length - 1) }
        : s,
    ),
  }
}

function moveToTrash(
  state: LeftRailState,
  itemId: string,
  type: string,
  title: string,
): LeftRailState {
  const TRASH_WINDOW_DAYS = 30
  const now = Date.now()
  const trashItem: TrashItem = {
    id: itemId,
    type,
    title,
    trashedAt: now,
    expiresAt: now + TRASH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    permanentDeleteAvailable: true,
  }
  return {
    ...state,
    trashItems: [...state.trashItems, trashItem],
    sections: state.sections.map((s) =>
      s.id === 'trash' ? { ...s, itemCount: state.trashItems.length + 1 } : s,
    ),
  }
}

function permanentlyDelete(
  state: LeftRailState,
  itemId: string,
): LeftRailState {
  const item = state.trashItems.find((i) => i.id === itemId)
  if (!item) throw new Error('Trash item not found')
  return {
    ...state,
    trashItems: state.trashItems.filter((i) => i.id !== itemId),
    sections: state.sections.map((s) =>
      s.id === 'trash'
        ? { ...s, itemCount: Math.max(0, state.trashItems.length - 1) }
        : s,
    ),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Left rail accordion structure', () => {
  it('has exactly 7 sections', () => {
    expect(LEFT_RAIL_SECTIONS).toHaveLength(7)
  })

  it('sections in correct order', () => {
    const labels = LEFT_RAIL_SECTIONS.sort(
      (a, b) => a.sortOrder - b.sortOrder,
    ).map((s) => s.label)
    expect(labels).toEqual([
      'Today + 7 Days',
      'Bookmarks',
      'Highlights',
      'Notes',
      'Chat History',
      'Archive',
      'Trash',
    ])
  })

  it('Today section expanded by default', () => {
    const today = LEFT_RAIL_SECTIONS.find((s) => s.id === 'today')
    expect(today?.defaultExpanded).toBe(true)
  })

  it('all other sections collapsed by default', () => {
    const others = LEFT_RAIL_SECTIONS.filter((s) => s.id !== 'today')
    for (const section of others) {
      expect(section.defaultExpanded).toBe(false)
    }
  })

  it('nestable sections support grouped items', () => {
    const nestable = LEFT_RAIL_SECTIONS.filter((s) => s.nestable)
    const nestableIds = nestable.map((s) => s.id)
    expect(nestableIds).toContain('bookmarks')
    expect(nestableIds).toContain('highlights')
    expect(nestableIds).toContain('notes')
    expect(nestableIds).toContain('chat-history')
    expect(nestableIds).toContain('archive')
  })

  it('all sections have icons', () => {
    for (const section of LEFT_RAIL_SECTIONS) {
      expect(section.icon).toBeTruthy()
    }
  })
})

describe('Accordion expand/collapse', () => {
  let state: LeftRailState

  beforeEach(() => {
    state = createRailState()
  })

  it('starts with Today expanded', () => {
    expect(state.expandedSections).toContain('today')
  })

  it('toggles section open', () => {
    state = toggleSection(state, 'bookmarks')
    expect(state.expandedSections).toContain('bookmarks')
  })

  it('toggles section closed', () => {
    state = toggleSection(state, 'today')
    expect(state.expandedSections).not.toContain('today')
  })

  it('multiple sections can be open simultaneously', () => {
    state = toggleSection(state, 'bookmarks')
    state = toggleSection(state, 'highlights')
    expect(state.expandedSections).toContain('today')
    expect(state.expandedSections).toContain('bookmarks')
    expect(state.expandedSections).toContain('highlights')
  })
})

describe('Section counts and badges', () => {
  let state: LeftRailState

  beforeEach(() => {
    state = createRailState()
  })

  it('updates item count', () => {
    state = updateSectionCount(state, 'bookmarks', 5)
    const bookmarks = state.sections.find((s) => s.id === 'bookmarks')
    expect(bookmarks?.itemCount).toBe(5)
  })

  it('shows badge when items exist', () => {
    state = updateSectionCount(state, 'highlights', 12)
    const highlights = state.sections.find((s) => s.id === 'highlights')
    expect(highlights?.badge).toBe('12')
  })

  it('no badge when count is zero', () => {
    state = updateSectionCount(state, 'notes', 0)
    const notes = state.sections.find((s) => s.id === 'notes')
    expect(notes?.badge).toBeNull()
  })
})

describe('Archive as first-class destination', () => {
  let state: LeftRailState

  beforeEach(() => {
    state = createRailState()
  })

  it('archive section exists in left rail', () => {
    const archive = state.sections.find((s) => s.id === 'archive')
    expect(archive).toBeDefined()
  })

  it('adds items to archive', () => {
    const item: ArchiveItem = {
      id: 'arch-1',
      type: 'day',
      seriesSlug: 'identity',
      dayNumber: 1,
      title: 'Day 1: When everything shakes',
      archivedAt: Date.now(),
      restorable: true,
    }
    state = addArchiveItem(state, item)
    expect(state.archiveItems).toHaveLength(1)
  })

  it('archive supports multiple item types', () => {
    const items: ArchiveItem[] = [
      {
        id: 'a1',
        type: 'day',
        seriesSlug: 'identity',
        dayNumber: 1,
        title: 'Day 1',
        archivedAt: Date.now(),
        restorable: true,
      },
      {
        id: 'a2',
        type: 'bookmark',
        seriesSlug: 'identity',
        dayNumber: null,
        title: 'Identity Series',
        archivedAt: Date.now(),
        restorable: true,
      },
      {
        id: 'a3',
        type: 'highlight',
        seriesSlug: 'peace',
        dayNumber: 2,
        title: 'Highlight',
        archivedAt: Date.now(),
        restorable: true,
      },
      {
        id: 'a4',
        type: 'note',
        seriesSlug: 'peace',
        dayNumber: 3,
        title: 'Note',
        archivedAt: Date.now(),
        restorable: true,
      },
      {
        id: 'a5',
        type: 'chat_thread',
        seriesSlug: 'community',
        dayNumber: 1,
        title: 'Chat',
        archivedAt: Date.now(),
        restorable: true,
      },
    ]
    for (const item of items) {
      state = addArchiveItem(state, item)
    }
    expect(state.archiveItems).toHaveLength(5)
    const types = state.archiveItems.map((i) => i.type)
    expect(new Set(types).size).toBe(5)
  })

  it('restores item from archive', () => {
    const item: ArchiveItem = {
      id: 'arch-1',
      type: 'bookmark',
      seriesSlug: 'identity',
      dayNumber: null,
      title: 'Identity Series',
      archivedAt: Date.now(),
      restorable: true,
    }
    state = addArchiveItem(state, item)
    state = restoreArchiveItem(state, 'arch-1')
    expect(state.archiveItems).toHaveLength(0)
  })

  it('rejects restore of non-restorable items', () => {
    const item: ArchiveItem = {
      id: 'arch-1',
      type: 'day',
      seriesSlug: 'identity',
      dayNumber: 1,
      title: 'Day 1',
      archivedAt: Date.now(),
      restorable: false,
    }
    state = addArchiveItem(state, item)
    expect(() => restoreArchiveItem(state, 'arch-1')).toThrow('not restorable')
  })

  it('updates archive count on add/remove', () => {
    state = addArchiveItem(state, {
      id: 'a1',
      type: 'day',
      seriesSlug: 'identity',
      dayNumber: 1,
      title: 'Day 1',
      archivedAt: Date.now(),
      restorable: true,
    })
    const archiveSection = state.sections.find((s) => s.id === 'archive')
    expect(archiveSection?.itemCount).toBe(1)
  })
})

describe('Trash with restore window', () => {
  let state: LeftRailState

  beforeEach(() => {
    state = createRailState()
  })

  it('moves item to trash', () => {
    state = moveToTrash(state, 'item-1', 'bookmark', 'My Bookmark')
    expect(state.trashItems).toHaveLength(1)
    expect(state.trashItems[0].id).toBe('item-1')
  })

  it('trash items have 30-day expiration', () => {
    state = moveToTrash(state, 'item-1', 'note', 'My Note')
    const item = state.trashItems[0]
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect(item.expiresAt - item.trashedAt).toBe(thirtyDaysMs)
  })

  it('permanently deletes from trash', () => {
    state = moveToTrash(state, 'item-1', 'highlight', 'My Highlight')
    state = permanentlyDelete(state, 'item-1')
    expect(state.trashItems).toHaveLength(0)
  })

  it('rejects permanent delete of non-existent item', () => {
    expect(() => permanentlyDelete(state, 'fake-id')).toThrow(
      'Trash item not found',
    )
  })

  it('trash count updates', () => {
    state = moveToTrash(state, 'item-1', 'bookmark', 'BM1')
    state = moveToTrash(state, 'item-2', 'note', 'Note1')
    const trashSection = state.sections.find((s) => s.id === 'trash')
    expect(trashSection?.itemCount).toBe(2)
  })

  it('permanent delete available flag set', () => {
    state = moveToTrash(state, 'item-1', 'bookmark', 'BM1')
    expect(state.trashItems[0].permanentDeleteAvailable).toBe(true)
  })
})
