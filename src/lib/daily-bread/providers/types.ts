/**
 * Provider-neutral text generation for Daily Bread V2.
 *
 * A provider turns (system, prompt) into text. It never sees the edition, the
 * repository or any other provider. Credentials are read from the environment
 * at call time and never stored on the provider object, so a provider can be
 * logged or serialized without leaking a key.
 */
import type { ProviderId } from '../types'

export interface TextGenerationRequest {
  task: string
  system: string
  prompt: string
  maxOutputTokens: number
  temperature?: number
  /** Ask the provider for a JSON object when it supports a JSON mode. */
  json?: boolean
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
