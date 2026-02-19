import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const DEFAULT_SUBMIT_TIMEOUT_MS = 15_000
const RETRYABLE_SUBMIT_CODES = new Set([
  'NO_CURATED_OPTIONS',
  'OPTION_ASSEMBLY_FAILED',
])
const RETRYABLE_SUBMIT_ERROR_PATTERNS = [
  /no curated options/i,
  /add one more sentence/i,
  /could not assemble devotional options/i,
]

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

type SubmitErrorPayload = {
  error?: string
  code?: string
}

function shouldRetrySubmit(payload: SubmitErrorPayload): boolean {
  if (payload.code && RETRYABLE_SUBMIT_CODES.has(payload.code)) return true
  if (!payload.error) return false
  return RETRYABLE_SUBMIT_ERROR_PATTERNS.some((pattern) =>
    pattern.test(payload.error || ''),
  )
}

function enrichAuditResponseForRetry(response: string): string {
  const trimmed = response.trim()
  if (!trimmed) return response
  const suffix = 'I need guidance for this season.'
  if (trimmed.toLowerCase().includes('guidance for this season')) {
    return trimmed
  }
  if (/[.!?]$/.test(trimmed)) return `${trimmed} ${suffix}`
  return `${trimmed}. ${suffix}`
}

export async function submitSoulAuditResponse(params: {
  response: string
  timeoutMs?: number
}): Promise<SoulAuditSubmitResponseV2> {
  const timeoutMs = Math.max(1, params.timeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const submitOnce = async (responseText: string) =>
      fetch('/api/soul-audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText }),
        signal: controller.signal,
      })

    let response = await submitOnce(params.response)

    if (!response.ok) {
      let payload = (await response
        .json()
        .catch(() => ({
          error: 'Unable to process soul audit right now.',
        }))) as SubmitErrorPayload | undefined

      if (shouldRetrySubmit(payload || {})) {
        const retryResponse = await submitOnce(
          enrichAuditResponseForRetry(params.response),
        )
        if (retryResponse.ok) {
          return (await retryResponse.json()) as SoulAuditSubmitResponseV2
        }
        response = retryResponse
        payload = (await response
          .json()
          .catch(() => ({
            error: 'Unable to process soul audit right now.',
          }))) as SubmitErrorPayload | undefined
      }

      throw new SoulAuditSubmitError(
        'server',
        String(payload?.error || 'Unable to process soul audit right now.'),
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
