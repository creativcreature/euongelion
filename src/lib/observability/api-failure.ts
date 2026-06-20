/**
 * api-failure.ts — canonical failure taxonomy + structured-stdout logger
 * for every API route under `src/app/api/`.
 *
 * ## Why this exists (F-039: Reliability — Error observability)
 *
 * `api-security.ts` already gives routes a per-request `requestId`, a
 * standardized `jsonError` envelope, and a structured `logApiError`
 * record. What it did NOT give was a *closed, queryable failure
 * taxonomy*: routes stamped ad-hoc `code` strings (or none), so logs
 * could not be grouped by failure class and dashboards had nothing
 * stable to alert on.
 *
 * This module adds exactly that — and nothing more. It is intentionally
 * modelled on `src/lib/soul-audit/telemetry.ts`: a tiny, dependency-free
 * helper that emits a single line of JSON to stdout/stderr (`console.*`),
 * which both Cloudflare Workers (`wrangler tail`) and Supabase
 * Edge/Functions capture and ship to their log drains. There is NO
 * external service and NO network call here — observability must never
 * add latency or a new failure surface to the product path.
 *
 * ## What a route does with this
 *
 * 1. On any handled failure, pick the matching `ApiFailureCode`.
 * 2. Pass that code into `jsonError({ ..., code })` so the *client* sees
 *    a stable machine-readable failure class alongside the human copy.
 * 3. Call `logApiFailure({ scope, requestId, code, error, ... })` so the
 *    *server* emits one structured, greppable JSON line stamped with the
 *    same `requestId` + `code`. The pair lets an operator correlate a
 *    user-reported `requestId` to the exact failure class in the logs.
 *
 * This is deliberately additive: `logApiError` (the older record-style
 * logger) keeps working for callers that have not adopted the taxonomy
 * yet. New/updated error paths should prefer `logApiFailure`.
 */

/**
 * Closed failure taxonomy. Every API error path maps to exactly one of
 * these. Keep this list small and stable — it is the alerting contract.
 *
 * Grouping (by leading prefix):
 *   - VALIDATION  — the request was rejected before any work ran
 *   - AUTH        — caller is not permitted to perform the action
 *   - RATE/BUDGET — a cost/abuse rail tripped (not a server fault)
 *   - UPSTREAM    — a dependency (DB, model, provider) failed
 *   - TIMEOUT     — a wall-clock / abort deadline fired
 *   - CONFIG      — the feature is not provisioned in this environment
 *   - INTERNAL    — an unclassified server fault (the catch-all 500)
 */
export type ApiFailureCode =
  // --- request rejected before work ran (4xx) ---
  | 'VALIDATION_BODY_INVALID' // malformed / oversized / unparseable body
  | 'VALIDATION_INPUT_INVALID' // a field failed a strict-regex / range guard
  | 'VALIDATION_NOT_FOUND' // the addressed resource does not exist
  // --- caller not permitted (401/403) ---
  | 'AUTH_REQUIRED' // sign-in is required for this action
  | 'AUTH_FORBIDDEN' // signed-in but not allowed (wrong mode / not owner)
  | 'AUTH_CONSENT_REQUIRED' // a consent / opt-in gate is not satisfied
  // --- cost / abuse rails (429) ---
  | 'RATE_LIMITED' // per-minute / per-day request ceiling tripped
  | 'BUDGET_EXCEEDED' // spend ceiling reached for the period
  // --- dependency failures (5xx) ---
  | 'UPSTREAM_DB_ERROR' // persistence layer (Supabase) failed
  | 'UPSTREAM_MODEL_ERROR' // an LLM / generation provider failed
  | 'UPSTREAM_PROVIDER_ERROR' // a non-model 3rd-party (billing, push) failed
  // --- deadlines (504) ---
  | 'TIMEOUT_DEADLINE_EXCEEDED' // wall-clock / abort deadline fired
  // --- environment not provisioned (501/503) ---
  | 'CONFIG_FEATURE_DISABLED' // feature flag off / required env unset
  // --- unclassified server fault (500) ---
  | 'INTERNAL_UNEXPECTED'

/**
 * Suggested HTTP status for each failure class. Routes are free to
 * override (e.g. a validation failure that should be a 409), but this
 * keeps the common case consistent so the same taxonomy code never maps
 * to wildly different statuses across routes.
 */
export const API_FAILURE_STATUS: Record<ApiFailureCode, number> = {
  VALIDATION_BODY_INVALID: 400,
  VALIDATION_INPUT_INVALID: 400,
  VALIDATION_NOT_FOUND: 404,
  AUTH_REQUIRED: 401,
  AUTH_FORBIDDEN: 403,
  AUTH_CONSENT_REQUIRED: 403,
  RATE_LIMITED: 429,
  BUDGET_EXCEEDED: 429,
  UPSTREAM_DB_ERROR: 502,
  UPSTREAM_MODEL_ERROR: 503,
  UPSTREAM_PROVIDER_ERROR: 502,
  TIMEOUT_DEADLINE_EXCEEDED: 504,
  CONFIG_FEATURE_DISABLED: 503,
  INTERNAL_UNEXPECTED: 500,
}

/**
 * `true` when the code denotes a server-side fault worth alerting on
 * (5xx classes). Client-caused failures (validation, auth, rate limits)
 * are expected traffic and should not page anyone. Dashboards group on
 * `severity` to separate "noise" from "incidents".
 */
export function isServerFault(code: ApiFailureCode): boolean {
  return API_FAILURE_STATUS[code] >= 500
}

interface SerializedFailure {
  name: string
  message: string
  stack?: string
}

function serializeFailure(error: unknown): SerializedFailure {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Stack is included for server faults so an operator can trace the
      // origin; it is never the user's input and carries no secret cookie.
      stack: error.stack,
    }
  }
  if (typeof error === 'string') {
    return { name: 'NonError', message: error }
  }
  // Never throw while serializing — fall back to a stable shape.
  try {
    return { name: 'NonError', message: JSON.stringify(error) }
  } catch {
    return { name: 'NonError', message: '[unserializable error value]' }
  }
}

export interface LogApiFailureParams {
  /** Route-scoped tag, e.g. `mock-account-export`. Greppable prefix. */
  scope: string
  /** Per-request id from `createRequestId()`. Correlates client ↔ log. */
  requestId: string
  /** The single taxonomy class this failure belongs to. */
  code: ApiFailureCode
  /** The thrown value, if any (omit for handled, non-throw failures). */
  error?: unknown
  /** HTTP method that produced the failure. */
  method?: string
  /** Request path. Never include query strings with user input. */
  path?: string
  /** Hashed client key (see api-security.getClientKey). Never a raw IP. */
  clientKey?: string
  /** Extra structured context. MUST NOT contain secrets / raw cookies. */
  context?: Record<string, unknown>
}

/**
 * Emit one structured, taxonomy-stamped failure line. Synchronous and
 * never throws — a logging failure must never be able to break a route.
 *
 * The line is a single JSON object prefixed with a stable
 * `[api:failure]` tag so it is greppable in a mixed log stream while
 * still parsing as JSON once the tag is stripped. Server faults (5xx)
 * go to stderr so they surface in error-only log filters; client-caused
 * failures (4xx) go to stdout so they don't pollute incident dashboards.
 */
export function logApiFailure(params: LogApiFailureParams): void {
  try {
    const serverFault = isServerFault(params.code)
    const payload: Record<string, unknown> = {
      scope: `api:${params.scope}`,
      event: 'api_failure',
      code: params.code,
      status: API_FAILURE_STATUS[params.code],
      severity: serverFault ? 'error' : 'warn',
      requestId: params.requestId,
      ts: new Date().toISOString(),
      ...(params.method ? { method: params.method } : {}),
      ...(params.path ? { path: params.path } : {}),
      ...(params.clientKey ? { clientKey: params.clientKey } : {}),
      ...(params.context ? { context: params.context } : {}),
      ...(typeof params.error !== 'undefined'
        ? { error: serializeFailure(params.error) }
        : {}),
    }
    const line = `[api:failure] ${JSON.stringify(payload)}`
    if (serverFault) {
      console.error(line)
    } else {
      console.warn(line)
    }
  } catch {
    // Observability is best-effort. Never let serialization escape into
    // the request path.
  }
}
