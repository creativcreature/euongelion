/**
 * Provider-neutral text generation for Daily Bread V2.
 *
 * A provider turns (system, prompt) into text. It never sees the edition, the
 * repository or any other provider. Credentials are read from the environment
 * at call time and never stored on the provider object, so a provider can be
 * logged or serialized without leaking a key.
 */
import { errorMessage } from '../redact'
import type { ProviderId } from '../types'

export interface TextGenerationRequest {
  task: string
  system: string
  prompt: string
  maxOutputTokens: number
  temperature?: number
  /** Ask the provider for a JSON object when it supports a JSON mode. */
  json?: boolean
  /**
   * Read-only access to this directory (Read and Grep) for a provider that can
   * use tools. The chain sends it only to a provider with `canReadFiles`.
   */
  readOnlyDir?: string
  signal: AbortSignal
}

export interface TextGenerationResult {
  text: string
  model: string
  inputTokens?: number
  outputTokens?: number
  estimatedCostUsd?: number
}

export interface TextProvider {
  readonly id: ProviderId
  readonly model: string
  /** True when the provider can search files it is pointed at (claude-cli). */
  readonly canReadFiles?: boolean
  /** Cheap, synchronous: are the credentials/binary for this provider present? */
  available(): boolean
  generate(request: TextGenerationRequest): Promise<TextGenerationResult>
}

/** A provider failure with a retry decision attached. */
export class ProviderError extends Error {
  readonly retryable: boolean
  readonly status?: number
  constructor(message: string, options: { retryable: boolean; status?: number }) {
    super(message)
    this.name = 'ProviderError'
    this.retryable = options.retryable
    this.status = options.status
  }
}

/** Output that parsed but failed validation — worth one retry, then move on. */
export class OutputValidationError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`output failed validation: ${problems.slice(0, 5).join('; ')}`)
    this.name = 'OutputValidationError'
    this.problems = problems
  }
}

export function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

const BILLING_RE = /credit balance|billing|payment required|insufficient[_ ]quota|exceeded your current quota/i

/**
 * Turn a non-OK HTTP response into a ProviderError that says WHY (the
 * provider's own error message, redacted and bounded), so an attempt row reads
 * "credit balance is too low" rather than "HTTP 400". Billing failures are
 * never retried.
 */
export async function httpFailure(provider: string, response: Response): Promise<ProviderError> {
  let reason = ''
  try {
    const body = (await response.text()).slice(0, 4000)
    try {
      const parsed = JSON.parse(body) as { error?: { message?: unknown } | string; message?: unknown }
      const msg =
        typeof parsed.error === 'string'
          ? parsed.error
          : typeof parsed.error?.message === 'string'
            ? parsed.error.message
            : typeof parsed.message === 'string'
              ? parsed.message
              : ''
      reason = msg || body
    } catch {
      reason = body
    }
  } catch {
    reason = ''
  }
  const clean = reason ? errorMessage(reason, 200).replace(/^Error: /, '') : ''
  const billing = BILLING_RE.test(reason)
  return new ProviderError(
    `${provider}: HTTP ${response.status}${billing ? ' (billing)' : ''}${clean ? ` — ${clean}` : ''}`,
    { retryable: !billing && retryableStatus(response.status), status: response.status },
  )
}
