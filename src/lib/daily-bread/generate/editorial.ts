/**
 * The provider-neutral editorial generation interface (plan §21, SA-142 /
 * F-184). Every piece of written copy the Daily Bread pipeline asks a model
 * for goes through `EditorialGenerator.generate` — the V2 editorial frame, and
 * the two Claude workflows that existed before V2 (the SA-100 Sunday lead and
 * the SA-114 How-to-Read guides), whose prompts are kept as they were.
 *
 * A caller describes the task (prompt, parser, validator, optional floor); the
 * generator decides who writes it: Claude first, then the configured backup,
 * then the deterministic floor when the task has one (§22–24). No caller
 * names a provider or spawns a CLI itself.
 */
import type { RunLogger } from '../log'
import { runProviderChain, type ChainOutcome, type ChainRequest } from '../providers/chain'
import type { TextProvider } from '../providers/types'

export interface GenerationRequest<T> extends ChainRequest {
  task: string
  /** Bump when the prompt's wording changes; recorded on every usage row (plan §27). */
  promptVersion: number
  /** Parse raw text; throw OutputValidationError (or any error) to reject. */
  parse: (text: string) => T
  /** Semantic validation. Empty array = valid; problems go back to the model once. */
  validate?: (value: T) => Promise<string[]> | string[]
  /** The zero-provider floor. Omit when there is none: failure then throws ProviderChainExhausted. */
  deterministic?: () => T | Promise<T>
  timeoutMs?: number
  retries?: number
}

export type GenerationResult<T> = ChainOutcome<T>

export interface EditorialGenerator {
  generate<T>(request: GenerationRequest<T>): Promise<GenerationResult<T>>
}

export function createEditorialGenerator(deps: {
  providers: TextProvider[]
  logger?: RunLogger
  timeoutMs?: number
  retries?: number
  sleep?: (ms: number) => Promise<void>
}): EditorialGenerator {
  return {
    generate<T>(request: GenerationRequest<T>) {
      const { task, promptVersion, parse, validate, deterministic, timeoutMs, retries, ...chainRequest } = request
      return runProviderChain<T>({
        task,
        promptVersion,
        providers: deps.providers,
        request: chainRequest,
        parse,
        validate,
        deterministic,
        timeoutMs: timeoutMs ?? deps.timeoutMs,
        retries: retries ?? deps.retries,
        logger: deps.logger,
        sleep: deps.sleep,
      })
    },
  }
}
