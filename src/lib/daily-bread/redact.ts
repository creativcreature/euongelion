/**
 * Secret redaction for Daily Bread V2 logs, attempt records and error
 * responses. Two layers: the literal values of every secret-bearing env var
 * the pipeline can see, and token-shaped patterns (so a key that was never in
 * the env list is still scrubbed).
 */

export const SECRET_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'CONTENT_PIPELINE_API_KEY',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_OAUTH_TOKEN_2',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'INTERNAL_ROUTE_SECRET',
  'CODEX_AUTH_JSON',
  'UPSTASH_REDIS_REST_TOKEN',
] as const

const TOKEN_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_\-]{8,}/g,
  /sk-[A-Za-z0-9_\-]{20,}/g,
  /AIza[0-9A-Za-z_\-]{20,}/g,
  /eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g,
  /(Bearer\s+)[A-Za-z0-9._\-]{16,}/gi,
  /([?&](?:key|token|apikey|api_key)=)[^&\s"']+/gi,
]

function secretValues(env: Record<string, string | undefined>): string[] {
  return SECRET_ENV_NAMES.map((name) => env[name])
    .filter((v): v is string => typeof v === 'string' && v.trim().length >= 8)
    .sort((a, b) => b.length - a.length)
}

export function redactString(
  input: string,
  env: Record<string, string | undefined> = process.env,
): string {
  let out = input
  for (const value of secretValues(env)) {
    out = out.split(value).join('[REDACTED]')
  }
  for (const re of TOKEN_PATTERNS) {
    out = out.replace(re, (match, prefix?: string) =>
      typeof prefix === 'string' && match.startsWith(prefix)
        ? `${prefix}[REDACTED]`
        : '[REDACTED]',
    )
  }
  return out
}

/** Deep-redact any JSON-able value. */
export function redact<T>(value: T, env: Record<string, string | undefined> = process.env): T {
  if (typeof value === 'string') return redactString(value, env) as T
  if (Array.isArray(value)) return value.map((v) => redact(v, env)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = /secret|token|password|api[_-]?key|authorization/i.test(k)
        ? '[REDACTED]'
        : redact(v, env)
    }
    return out as T
  }
  return value
}

/** A safe, short error message: redacted, single-line, bounded. */
export function errorMessage(error: unknown, max = 400): string {
  const raw =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : 'Unknown error'
  return redactString(raw).replace(/\s+/g, ' ').slice(0, max)
}
