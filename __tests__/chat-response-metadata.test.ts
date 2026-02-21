import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST as chatHandler } from '@/app/api/chat/route'

describe('Chat response metadata', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns guardrail metadata and visible citations for assistant replies', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  'Consider John 3:16 and Romans 8:1 as you pray today. John 3:16 reminds you that God loved the world and gave His Son, while Romans 8:1 assures that there is no condemnation for those in Christ Jesus. Hold these together in prayer so assurance and repentance remain connected as you seek faithful obedience.',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      )
    })

    vi.stubGlobal('fetch', fetchMock)

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userApiKey: 'sk-testkeyvalue1234567890123456789012345678',
        devotionalSlug: 'identity-crisis-day-1',
        highlightedText: 'too much on my plate',
        messages: [
          {
            role: 'user',
            content: 'What passage should I meditate on this morning?',
          },
        ],
      }),
    })

    const response = await chatHandler(request as never)
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      guardrails?: {
        scope?: string
        internetSearch?: boolean
        hasHighlightedText?: boolean
        hasDevotionalContext?: boolean
      }
      citations?: Array<{ source: string }>
    }

    expect(payload.guardrails?.scope).toBe('local-corpus-only')
    expect(payload.guardrails?.internetSearch).toBe(false)
    expect(payload.guardrails?.hasHighlightedText).toBe(true)
    expect(payload.guardrails?.hasDevotionalContext).toBe(true)
    expect(payload.citations?.some((c) => c.source === 'John 3:16')).toBe(true)
    expect(payload.citations?.some((c) => c.source === 'Romans 8:1')).toBe(true)
  })
})
