/**
 * Structured, redacted logging + stage timing for the Daily Bread V2 pipeline.
 *
 * One JSON object per line, prefixed `[daily-bread]` so Workers observability
 * and GitHub Actions logs are both greppable. Every line is passed through
 * redact() — a provider error that echoes a key cannot leak it.
 */
import { errorMessage, redact } from './redact'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogSink {
  (level: LogLevel, line: string): void
}

const consoleSink: LogSink = (level, line) => {
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export interface RunLogger {
  runId: string
  log(level: LogLevel, event: string, fields?: Record<string, unknown>): void
  info(event: string, fields?: Record<string, unknown>): void
  warn(event: string, fields?: Record<string, unknown>): void
  error(event: string, error: unknown, fields?: Record<string, unknown>): void
  /** Time an async stage; the timing is recorded even when the stage throws. */
  stage<T>(name: string, fn: () => Promise<T>): Promise<T>
  timings(): { stage: string; ms: number }[]
}

export function createRunLogger(
  runId: string,
  options: { sink?: LogSink; now?: () => number; base?: Record<string, unknown> } = {},
): RunLogger {
  const sink = options.sink ?? consoleSink
  const now = options.now ?? (() => Date.now())
  const stageTimings: { stage: string; ms: number }[] = []

  const log = (level: LogLevel, event: string, fields: Record<string, unknown> = {}) => {
    const payload = redact({
      scope: 'daily-bread',
      event,
      level,
      runId,
      ts: new Date().toISOString(),
      ...options.base,
      ...fields,
    })
    sink(level, `[daily-bread] ${JSON.stringify(payload)}`)
  }

  return {
    runId,
    log,
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, error, fields) =>
      log('error', event, { ...fields, error: errorMessage(error) }),
    async stage<T>(name: string, fn: () => Promise<T>): Promise<T> {
      const started = now()
      try {
        return await fn()
      } finally {
        const ms = Math.max(0, Math.round(now() - started))
        stageTimings.push({ stage: name, ms })
        log('debug', 'stage_timing', { stage: name, ms })
      }
    },
    timings: () => stageTimings.slice(),
  }
}

export function newRunId(prefix = 'db2'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.floor(Date.now() % 1e8).toString(36)
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${rand}`
}
