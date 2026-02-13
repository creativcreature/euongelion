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
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/devotional context/i)
  })
})
