/**
 * SA-059 — what the reader writes never reaches the model.
 *
 * `/api/chat` accepts `highlightedText` and puts it straight into the prompt.
 * Today that string is always PUBLISHED devotional text the reader selected,
 * which is fine and is what the highlight toolbar's "Ask" is for. The moment
 * journaling exists, the same channel could carry the reader's own writing —
 * and religious belief is special-category data under GDPR Art. 9.
 *
 * The server cannot tell published prose from a journal entry by inspecting a
 * string, so this is a boundary discipline rather than a cryptographic
 * guarantee. Its value is that a future "ask about my note" button fails loudly
 * here instead of shipping quietly.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(path, 'utf8')

describe('the reader’s own writing never reaches the model', () => {
  it('JournalField has no route into the chat', () => {
    const source = read('src/components/reader/JournalField.tsx')
    expect(source).not.toContain('useChatStore')
    expect(source).not.toContain('/api/chat')
  })

  it('the chat route refuses an explicitly journal-sourced payload', () => {
    const source = read('src/app/api/chat/route.ts')
    expect(source).toContain('JOURNAL_CONTEXT_REFUSED')
  })

  it('carries the reason in the file, so the guard is not deleted as dead code', () => {
    const source = read('src/app/api/chat/route.ts')
    expect(source).toMatch(/Art\.\s*9|special-category/i)
  })
})
