import { afterEach, describe, expect, it, vi } from 'vitest'

// Open-web is OFF by default now (SA-008 — chat = local corpus + devotional
// context only). This contract covers the acknowledgement gate that applies
// ONLY when open-web is enabled, so it forces the capability flag on.
vi.mock('@/lib/brain/flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/brain/flags')>()
  return {
    ...actual,
    brainFlags: { ...actual.brainFlags, openWebModeEnabled: true },
  }
})

import { POST as chatHandler } from '@/app/api/chat/route'

describe('Chat open-web acknowledgement contract', () => {
  const priorSearchApi = process.env.OPEN_WEB_SEARCH_API_URL

  afterEach(() => {
    process.env.OPEN_WEB_SEARCH_API_URL = priorSearchApi
  })

  it('requires explicit acknowledgement when open-web mode is requested', async () => {
    process.env.OPEN_WEB_SEARCH_API_URL = 'https://example.com/search'

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        devotionalSlug: 'identity-crisis-day-1',
        openWebMode: true,
        openWebAcknowledged: false,
        messages: [
          {
            role: 'user',
            content: 'Compare this passage with current events.',
          },
        ],
      }),
    })

    const response = await chatHandler(request as never)
    expect(response.status).toBe(400)
    const payload = (await response.json()) as {
      error?: string
      code?: string
    }
    expect(payload.code).toBe('OPEN_WEB_ACK_REQUIRED')
    expect(payload.error).toMatch(/acknowledgement/i)
  })
})
