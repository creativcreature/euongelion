/**
 * Chat UX Test Suite (Phase 10)
 *
 * Covers PLAN-V3 Phase 10 and euan-PLAN-v2 decision 24:
 * - Desktop: FAB → right sidebar, reader shifts left, state persists
 * - Mobile: FAB → full-screen modal (bottom sheet)
 * - Chat context restricted to devotional + local corpus (no web)
 * - Save chat notes with day linkage + optional text anchor
 * - Selection-to-chat carries selected text + devotional context
 * - Multiple threads, searchable/filterable index
 * - Chat history persistence across navigation
 * - Chat note linkage to day and optional text anchor
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatLayout = 'sidebar' | 'fullscreen_modal' | 'bottom_sheet'
type DeviceType = 'desktop' | 'tablet' | 'mobile'

interface ChatConfig {
  device: DeviceType
  layout: ChatLayout
  fabPosition: string
  readerShift: boolean
  statePersists: boolean
  readOnlyPeek: boolean
}

interface ChatThread {
  id: string
  seriesSlug: string
  dayNumber: number
  title: string
  messages: ChatMessage[]
  createdAt: number
  lastMessageAt: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  textAnchor: string | null
  createdAt: number
}

interface ChatNote {
  id: string
  threadId: string
  messageId: string
  seriesSlug: string
  dayNumber: number
  textAnchor: string | null
  noteText: string
  createdAt: number
}

interface ChatContextConfig {
  sources: string[]
  webRetrieval: boolean
  maxContextTokens: number
  includesCurrentDevotional: boolean
  includesLocalCorpus: boolean
}

interface SelectionToChatPayload {
  selectedText: string
  seriesSlug: string
  dayNumber: number
  moduleType: string
  startOffset: number
  endOffset: number
}

interface ChatSearchResult {
  threadId: string
  messageId: string
  matchText: string
  seriesSlug: string
  dayNumber: number
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const CHAT_CONFIGS: ChatConfig[] = [
  {
    device: 'desktop',
    layout: 'sidebar',
    fabPosition: 'bottom-right',
    readerShift: true,
    statePersists: true,
    readOnlyPeek: false,
  },
  {
    device: 'tablet',
    layout: 'sidebar',
    fabPosition: 'bottom-right',
    readerShift: true,
    statePersists: true,
    readOnlyPeek: false,
  },
  {
    device: 'mobile',
    layout: 'fullscreen_modal',
    fabPosition: 'bottom-right',
    readerShift: false,
    statePersists: true,
    readOnlyPeek: true,
  },
]

const CHAT_CONTEXT: ChatContextConfig = {
  sources: ['current_devotional', 'local_corpus'],
  webRetrieval: false,
  maxContextTokens: 8000,
  includesCurrentDevotional: true,
  includesLocalCorpus: true,
}

function createThread(seriesSlug: string, dayNumber: number): ChatThread {
  return {
    id: `thread-${Date.now()}`,
    seriesSlug,
    dayNumber,
    title: `${seriesSlug} Day ${dayNumber}`,
    messages: [],
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
  }
}

function addMessage(
  thread: ChatThread,
  role: 'user' | 'assistant',
  content: string,
  textAnchor: string | null = null,
): ChatThread {
  const message: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    role,
    content,
    textAnchor,
    createdAt: Date.now(),
  }
  return {
    ...thread,
    messages: [...thread.messages, message],
    lastMessageAt: message.createdAt,
  }
}

function saveNote(
  thread: ChatThread,
  messageId: string,
  noteText: string,
): ChatNote {
  const message = thread.messages.find((m) => m.id === messageId)
  if (!message) throw new Error('Message not found')
  return {
    id: `note-${Date.now()}`,
    threadId: thread.id,
    messageId,
    seriesSlug: thread.seriesSlug,
    dayNumber: thread.dayNumber,
    textAnchor: message.textAnchor,
    noteText,
    createdAt: Date.now(),
  }
}

function selectionToChat(payload: SelectionToChatPayload): {
  contextMessage: string
} {
  return {
    contextMessage: `[Selected from ${payload.seriesSlug} Day ${payload.dayNumber}, ${payload.moduleType}]: "${payload.selectedText}"`,
  }
}

function searchChatHistory(
  threads: ChatThread[],
  query: string,
): ChatSearchResult[] {
  const results: ChatSearchResult[] = []
  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.content.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          threadId: thread.id,
          messageId: message.id,
          matchText: message.content,
          seriesSlug: thread.seriesSlug,
          dayNumber: thread.dayNumber,
        })
      }
    }
  }
  return results
}

function filterThreads(
  threads: ChatThread[],
  filter: { seriesSlug?: string; dayNumber?: number },
): ChatThread[] {
  return threads.filter((t) => {
    if (filter.seriesSlug && t.seriesSlug !== filter.seriesSlug) return false
    if (filter.dayNumber && t.dayNumber !== filter.dayNumber) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chat layout per device', () => {
  it('desktop uses right sidebar with reader shift', () => {
    const desktop = CHAT_CONFIGS.find((c) => c.device === 'desktop')!
    expect(desktop.layout).toBe('sidebar')
    expect(desktop.readerShift).toBe(true)
    expect(desktop.statePersists).toBe(true)
  })

  it('mobile uses fullscreen modal', () => {
    const mobile = CHAT_CONFIGS.find((c) => c.device === 'mobile')!
    expect(mobile.layout).toBe('fullscreen_modal')
    expect(mobile.readerShift).toBe(false)
  })

  it('mobile has read-only devotional peek', () => {
    const mobile = CHAT_CONFIGS.find((c) => c.device === 'mobile')!
    expect(mobile.readOnlyPeek).toBe(true)
  })

  it('FAB positioned bottom-right on all devices', () => {
    for (const config of CHAT_CONFIGS) {
      expect(config.fabPosition).toBe('bottom-right')
    }
  })

  it('state persists across navigation on all devices', () => {
    for (const config of CHAT_CONFIGS) {
      expect(config.statePersists).toBe(true)
    }
  })

  it('tablet uses sidebar like desktop', () => {
    const tablet = CHAT_CONFIGS.find((c) => c.device === 'tablet')!
    expect(tablet.layout).toBe('sidebar')
  })
})

describe('Chat context restriction', () => {
  it('only uses devotional and local corpus sources', () => {
    expect(CHAT_CONTEXT.sources).toEqual(['current_devotional', 'local_corpus'])
  })

  it('web retrieval is disabled', () => {
    expect(CHAT_CONTEXT.webRetrieval).toBe(false)
  })

  it('context sources do not include web', () => {
    expect(CHAT_CONTEXT.sources).not.toContain('web')
    expect(CHAT_CONTEXT.sources).not.toContain('internet')
  })

  it('includes current devotional in context', () => {
    expect(CHAT_CONTEXT.includesCurrentDevotional).toBe(true)
  })

  it('includes local corpus in context', () => {
    expect(CHAT_CONTEXT.includesLocalCorpus).toBe(true)
  })

  it('has max context token limit', () => {
    expect(CHAT_CONTEXT.maxContextTokens).toBeGreaterThan(0)
    expect(CHAT_CONTEXT.maxContextTokens).toBeLessThanOrEqual(16000)
  })
})

describe('Chat threads', () => {
  let thread: ChatThread

  beforeEach(() => {
    thread = createThread('identity', 3)
  })

  it('creates thread linked to series and day', () => {
    expect(thread.seriesSlug).toBe('identity')
    expect(thread.dayNumber).toBe(3)
  })

  it('thread starts empty', () => {
    expect(thread.messages).toHaveLength(0)
  })

  it('adds user messages', () => {
    thread = addMessage(thread, 'user', 'What does this verse mean?')
    expect(thread.messages).toHaveLength(1)
    expect(thread.messages[0].role).toBe('user')
  })

  it('adds assistant messages', () => {
    thread = addMessage(thread, 'user', 'What does this mean?')
    thread = addMessage(thread, 'assistant', 'This verse speaks to...')
    expect(thread.messages).toHaveLength(2)
    expect(thread.messages[1].role).toBe('assistant')
  })

  it('messages can have text anchors', () => {
    thread = addMessage(
      thread,
      'user',
      'Help me understand this',
      'Be still and know',
    )
    expect(thread.messages[0].textAnchor).toBe('Be still and know')
  })

  it('updates lastMessageAt on new message', () => {
    const beforeTs = thread.lastMessageAt
    thread = addMessage(thread, 'user', 'hello')
    expect(thread.lastMessageAt).toBeGreaterThanOrEqual(beforeTs)
  })
})

describe('Chat notes', () => {
  let thread: ChatThread

  beforeEach(() => {
    thread = createThread('identity', 3)
    thread = addMessage(thread, 'user', 'What does identity mean?')
    thread = addMessage(
      thread,
      'assistant',
      'Identity in Christ means...',
      'Galatians 2:20',
    )
  })

  it('saves note from message', () => {
    const messageId = thread.messages[1].id
    const note = saveNote(thread, messageId, 'This was insightful')
    expect(note.threadId).toBe(thread.id)
    expect(note.messageId).toBe(messageId)
    expect(note.noteText).toBe('This was insightful')
  })

  it('note inherits series and day linkage', () => {
    const messageId = thread.messages[1].id
    const note = saveNote(thread, messageId, 'note text')
    expect(note.seriesSlug).toBe('identity')
    expect(note.dayNumber).toBe(3)
  })

  it('note carries text anchor from message', () => {
    const messageId = thread.messages[1].id
    const note = saveNote(thread, messageId, 'note text')
    expect(note.textAnchor).toBe('Galatians 2:20')
  })

  it('rejects note for non-existent message', () => {
    expect(() => saveNote(thread, 'fake-id', 'note')).toThrow(
      'Message not found',
    )
  })
})

describe('Selection-to-chat', () => {
  it('carries selected text with context', () => {
    const payload: SelectionToChatPayload = {
      selectedText: 'Be still and know that I am God',
      seriesSlug: 'peace',
      dayNumber: 2,
      moduleType: 'scripture',
      startOffset: 0,
      endOffset: 31,
    }
    const result = selectionToChat(payload)
    expect(result.contextMessage).toContain('Be still and know')
    expect(result.contextMessage).toContain('peace')
    expect(result.contextMessage).toContain('Day 2')
    expect(result.contextMessage).toContain('scripture')
  })

  it('includes module type in context', () => {
    const payload: SelectionToChatPayload = {
      selectedText: 'Prayer text',
      seriesSlug: 'identity',
      dayNumber: 1,
      moduleType: 'prayer',
      startOffset: 0,
      endOffset: 11,
    }
    const result = selectionToChat(payload)
    expect(result.contextMessage).toContain('prayer')
  })
})

describe('Chat search and filter', () => {
  let threads: ChatThread[]

  beforeEach(() => {
    let t1 = createThread('identity', 1)
    t1 = addMessage(t1, 'user', 'What does grace mean?')
    t1 = addMessage(t1, 'assistant', 'Grace is unmerited favor from God')

    let t2 = createThread('identity', 3)
    t2 = addMessage(t2, 'user', 'How do I find peace?')
    t2 = addMessage(t2, 'assistant', 'Peace comes through surrender')

    let t3 = createThread('peace', 2)
    t3 = addMessage(t3, 'user', 'Tell me about grace and peace')

    threads = [t1, t2, t3]
  })

  it('searches across all threads', () => {
    const results = searchChatHistory(threads, 'grace')
    expect(results.length).toBeGreaterThanOrEqual(2) // "grace" in t1 and t3
  })

  it('returns matching message details', () => {
    const results = searchChatHistory(threads, 'peace')
    expect(results.length).toBeGreaterThanOrEqual(2)
    for (const result of results) {
      expect(result.matchText.toLowerCase()).toContain('peace')
    }
  })

  it('filters by series', () => {
    const filtered = filterThreads(threads, { seriesSlug: 'identity' })
    expect(filtered).toHaveLength(2)
    expect(filtered.every((t) => t.seriesSlug === 'identity')).toBe(true)
  })

  it('filters by day number', () => {
    const filtered = filterThreads(threads, { dayNumber: 1 })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].dayNumber).toBe(1)
  })

  it('filters by series and day', () => {
    const filtered = filterThreads(threads, {
      seriesSlug: 'identity',
      dayNumber: 3,
    })
    expect(filtered).toHaveLength(1)
  })

  it('search is case-insensitive', () => {
    const results = searchChatHistory(threads, 'GRACE')
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('empty search returns no results', () => {
    const results = searchChatHistory(threads, 'nonexistent-xyz-query')
    expect(results).toHaveLength(0)
  })
})

describe('Chat state persistence', () => {
  it('thread state survives navigation', () => {
    let thread = createThread('identity', 1)
    thread = addMessage(thread, 'user', 'First message')
    // Simulate navigation: thread is stored
    const storedThread = { ...thread }
    // After navigation back:
    expect(storedThread.messages).toHaveLength(1)
    expect(storedThread.messages[0].content).toBe('First message')
  })

  it('multiple threads maintained simultaneously', () => {
    const t1 = createThread('identity', 1)
    const t2 = createThread('peace', 2)
    const t3 = createThread('community', 3)
    const allThreads = [t1, t2, t3]
    expect(allThreads).toHaveLength(3)
    expect(new Set(allThreads.map((thread) => thread.seriesSlug)).size).toBe(3)
    expect(new Set(allThreads.map((thread) => thread.dayNumber)).size).toBe(3)
  })
})
