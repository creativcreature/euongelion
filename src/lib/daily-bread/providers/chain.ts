/**
 * The generator chain: Claude → secondary remote provider → zero-provider
 * deterministic composition. Every step is bounded (timeout per attempt,
 * limited retries), every output is parsed and validated before it is
 * accepted, and every attempt is recorded as ProviderUsage for the
 * PublicationAttempt row. The deterministic step is the floor: it needs no
 * network and no credential, so a total AI outage still produces an edition —
 * one that records, in its provenance, exactly why.
 */
import type { RunLogger } from '../log'
import { errorMessage } from '../redact'
import type { ProviderId, ProviderUsage } from '../types'
import {
  OutputValidationError,
  ProviderError,
  type TextProvider,
} from './types'

export interface ChainRequest {
  system: string
  prompt: string
  maxOutputTokens: number
  temperature?: number
  json?: boolean
}

export interface ChainOutcome<T> {
  value: T
  provider: ProviderId
  model?: string
  usage: ProviderUsage[]
  /** Providers after the first configured one that were actually tried. */
  fallbackProvidersUsed: ProviderId[]
  /** True when the value came from the deterministic floor. */
  deterministic: boolean
}

export interface ChainOptions<T> {
  task: string
  providers: TextProvider[]
  request: ChainRequest
  /** Parse raw text; throw OutputValidationError (or any error) to reject. */
  parse: (text: string) => T
  /** Semantic validation (e.g. Scripture lookups). Empty array = valid. */
  validate?: (value: T) => Promise<string[]> | string[]
  deterministic: () => T | Promise<T>
  timeoutMs?: number
  /** Extra attempts per provider for retryable failures (default 1). */
  retries?: number
  logger?: RunLogger
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Pull the first JSON object out of model text (tolerates ``` fences / prose). */
export function extractJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new OutputValidationError(['no JSON object in output'])
  }
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new OutputValidationError(['output is not valid JSON'])
  }
}

export async function runProviderChain<T>(options: ChainOptions<T>): Promise<ChainOutcome<T>> {
  const timeoutMs = options.timeoutMs ?? 90_000
  const retries = Math.max(0, Math.min(3, options.retries ?? 1))
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? (() => Date.now())
  const usage: ProviderUsage[] = []
  const tried: ProviderId[] = []

  for (const provider of options.providers) {
    if (!provider.available()) {
      usage.push({
        provider: provider.id,
        model: provider.model,
        task: options.task,
        ok: false,
        attempts: 0,
        durationMs: 0,
        error: 'unavailable (not configured)',
      })
      continue
    }
    tried.push(provider.id)
    let attempts = 0
    const started = now()
    let lastError = ''
    let inputTokens = 0
    let outputTokens = 0
    let cost = 0

    while (attempts <= retries) {
      attempts += 1
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const result = await provider.generate({
          task: options.task,
          ...options.request,
          signal: controller.signal,
        })
        inputTokens += result.inputTokens ?? 0
        outputTokens += result.outputTokens ?? 0
        cost += result.estimatedCostUsd ?? 0
        const value = options.parse(result.text)
        const problems = options.validate ? await options.validate(value) : []
        if (problems.length > 0) throw new OutputValidationError(problems)
        usage.push({
          provider: provider.id,
          model: result.model,
          task: options.task,
          ok: true,
          attempts,
          durationMs: Math.max(0, now() - started),
          inputTokens,
          outputTokens,
          estimatedCostUsd: cost,
        })
        options.logger?.info('provider_success', {
          task: options.task,
          provider: provider.id,
          attempts,
        })
        return {
          value,
          provider: provider.id,
          model: result.model,
          usage,
          fallbackProvidersUsed: tried.slice(1),
          deterministic: false,
        }
      } catch (error) {
        lastError = errorMessage(error, 300)
        const retryable =
          error instanceof ProviderError
            ? error.retryable
            : error instanceof OutputValidationError
        options.logger?.warn('provider_attempt_failed', {
          task: options.task,
          provider: provider.id,
          attempt: attempts,
          retryable,
          error: lastError,
        })
        if (!retryable || attempts > retries) break
        await sleep(Math.min(8_000, 750 * 2 ** (attempts - 1)))
      } finally {
        clearTimeout(timer)
      }
    }

    usage.push({
      provider: provider.id,
      model: provider.model,
      task: options.task,
      ok: false,
      attempts,
      durationMs: Math.max(0, now() - started),
      inputTokens: inputTokens || undefined,
      outputTokens: outputTokens || undefined,
      estimatedCostUsd: cost || undefined,
      error: lastError,
    })
  }

  // The floor. If this throws, the task genuinely cannot be done and the
  // caller must surface it — there is nothing beneath deterministic.
  const started = now()
  const value = await options.deterministic()
  usage.push({
    provider: 'deterministic',
    task: options.task,
    ok: true,
    attempts: 1,
    durationMs: Math.max(0, now() - started),
  })
  options.logger?.warn('provider_chain_deterministic', { task: options.task })
  return {
    value,
    provider: 'deterministic',
    usage,
    fallbackProvidersUsed: [...tried.slice(1), 'deterministic'],
    deterministic: true,
  }
}
