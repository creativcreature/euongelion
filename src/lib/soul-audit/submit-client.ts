import { PASTORAL_MESSAGES } from '@/lib/soul-audit/messages'
import type {
  SoulAuditClarifierResponse,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

export type SoulAuditSubmitResult =
  | SoulAuditSubmitResponseV2
  | SoulAuditClarifierResponse

// LLM outline generation (3 outlines × 7 days) takes 30-60s on Anthropic.
// 90s gives headroom for slow providers without false client-side timeouts.
const DEFAULT_SUBMIT_TIMEOUT_MS = 90_000

export type SoulAuditSubmitErrorCode = 'timeout' | 'offline' | 'server'

export class SoulAuditSubmitError extends Error {
  readonly code: SoulAuditSubmitErrorCode

  constructor(code: SoulAuditSubmitErrorCode, message: string) {
    super(message)
    this.name = 'SoulAuditSubmitError'
    this.code = code
  }
}

/** Type guard: check if the submit result is a clarifier prompt (not a full response) */
export function isClarifierResponse(
  result: SoulAuditSubmitResult,
): result is SoulAuditClarifierResponse {
  return (
    'clarifierRequired' in result &&
    result.clarifierRequired === true &&
    !(
      'auditRunId' in result && (result as SoulAuditSubmitResponseV2).auditRunId
    )
  )
}

function isAbortLike(error: unknown) {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export async function submitSoulAuditResponse(params: {
  response: string
  clarifierResponse?: string
  clarifierToken?: string
  timeoutMs?: number
}): Promise<SoulAuditSubmitResult> {
  const timeoutMs = Math.max(1, params.timeoutMs ?? DEFAULT_SUBMIT_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const body: Record<string, string> = {
      response: params.response,
    }
    if (params.clarifierResponse) {
      body.clarifierResponse = params.clarifierResponse
    }
    if (params.clarifierToken) {
      body.clarifierToken = params.clarifierToken
    }

    const response = await fetch('/api/soul-audit/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({
        error: PASTORAL_MESSAGES.GENERIC_ERROR,
      }))) as { error?: string } | undefined

      throw new SoulAuditSubmitError(
        'server',
        String(payload?.error || PASTORAL_MESSAGES.GENERIC_ERROR),
      )
    }

    return (await response.json()) as SoulAuditSubmitResult
  } catch (error) {
    if (error instanceof SoulAuditSubmitError) {
      throw error
    }

    if (isAbortLike(error)) {
      throw new SoulAuditSubmitError('timeout', PASTORAL_MESSAGES.TIMEOUT)
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new SoulAuditSubmitError('offline', PASTORAL_MESSAGES.OFFLINE)
    }

    throw new SoulAuditSubmitError('server', PASTORAL_MESSAGES.GENERIC_ERROR)
  } finally {
    clearTimeout(timeout)
  }
}
