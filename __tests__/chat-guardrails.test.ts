import { describe, expect, it } from 'vitest'
import { POST as chatHandler } from '@/app/api/chat/route'

describe('Chat local-corpus guardrails edge cases', () => {
  it('rejects chat when devotional context is missing', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What do you think?' }],
      }),
    })

    const response = await chatHandler(request as never)
    expect(response.status).toBe(400)
    expect(response.headers.get('X-Request-Id')).toBeTruthy()
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/devotional context/i)
  })

  it('rejects chat when devotional slug does not resolve to local context', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        devotionalSlug: 'not-a-real-devotional',
        messages: [{ role: 'user', content: 'Explain this passage.' }],
      }),
    })

    const response = await chatHandler(request as never)
    expect([400, 503]).toContain(response.status)
    expect(response.headers.get('X-Request-Id')).toBeTruthy()
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/unavailable/i)
  })
})
