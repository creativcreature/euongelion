import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatMessage from '@/components/ChatMessage'
import type { ChatMessage as ChatMessageType } from '@/types'

function buildAssistantMessage(): ChatMessageType {
  return {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Consider John 3:16 and Romans 8:1 while you pray.',
    devotionalSlug: 'identity-crisis-day-1',
    citations: [
      {
        id: 'c1',
        label: 'Scripture',
        type: 'scripture',
        source: 'John 3:16',
      },
      {
        id: 'c2',
        label: 'Scripture',
        type: 'scripture',
        source: 'Romans 8:1',
      },
      {
        id: 'c3',
        label: 'Devotional Context',
        type: 'devotional_context',
        source: 'public/devotionals/identity-crisis-day-1.json',
      },
      {
        id: 'c4',
        label: 'Reference',
        type: 'local_reference',
        source: 'content/reference/README.md',
      },
      {
        id: 'c2',
        label: 'Scripture Duplicate',
        type: 'scripture',
        source: 'Romans 8:1',
      },
    ],
    guardrails: {
      scope: 'local-corpus-only',
      internetSearch: false,
      devotionalSlug: 'identity-crisis-day-1',
      hasHighlightedText: false,
      hasDevotionalContext: true,
      hasReferenceContext: true,
      sources: ['public/devotionals/identity-crisis-day-1.json'],
    },
    favorited: false,
    colorLabel: 'none',
    createdAt: new Date().toISOString(),
  }
}

describe('ChatMessage citation rendering', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('collapses citation list by default and expands on demand', async () => {
    const user = userEvent.setup()
    render(
      <ChatMessage
        message={buildAssistantMessage()}
        onToggleFavorite={() => {}}
        onSetColorLabel={() => {}}
      />,
    )

    // Default collapsed view should show only 3 citations.
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText('Romans 8:1')).toBeInTheDocument()
    expect(
      screen.getByText(/public\/devotionals\/identity-crisis-day-1\.json/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/local reference: content\/reference\/readme\.md/i),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show all sources/i }))

    expect(screen.getByText('content/reference/README.md')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /show fewer sources/i }),
    ).toBeInTheDocument()
  })

  it('copies visible citation payload to clipboard', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn<(value: string) => Promise<void>>(async () => {})
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <ChatMessage
        message={buildAssistantMessage()}
        onToggleFavorite={() => {}}
        onSetColorLabel={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: /copy sources/i }))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(String(writeText.mock.calls[0]?.[0] || '')).toContain('John 3:16')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    })
  })
})
