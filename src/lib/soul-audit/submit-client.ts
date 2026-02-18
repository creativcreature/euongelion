import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const DEFAULT_SUBMIT_TIMEOUT_MS = 15_000

export type SoulAuditSubmitErrorCode = 'timeout' | 'offline' | 'server'

export class SoulAuditSubmitError extends Error {
  readonly code: SoulAuditSubmitErrorCode

  constructor(code: SoulAuditSubmitErrorCode, message: string) {
    super(message)
    this.name = 'SoulAuditSubmitError'
    this.code = code
  }
}

function isAbortLike(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export async function submitSoulAuditResponse(params: {
  response: string
  timeoutMs?: number
}): Promise<SoulAuditSubmitResponseV2> {
  const timeoutMs = Math.max(1, params.timeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('/api/soul-audit/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: params.response }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await response
        .json()
        .catch(() => ({ error: 'Unable to process soul audit right now.' }))
      throw new SoulAuditSubmitError(
        'server',
        String(payload.error || 'Unable to process soul audit right now.'),
      )
    }

    return (await response.json()) as SoulAuditSubmitResponseV2
  } catch (error) {
    if (error instanceof SoulAuditSubmitError) {
      throw error
    }

    if (isAbortLike(error)) {
      throw new SoulAuditSubmitError(
        'timeout',
        'Soul Audit timed out. Please check your connection and retry.',
      )
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new SoulAuditSubmitError(
        'offline',
        'You are offline. Reconnect to generate your devotional options.',
      )
    }

    throw new SoulAuditSubmitError(
      'server',
      'Something broke. Try again in a moment.',
    )
  } finally {
    clearTimeout(timeout)
  }
}
