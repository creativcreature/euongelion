/**
 * Error Resilience Test Suite
 *
 * Covers error handling, graceful degradation, and recovery:
 * - Network failure handling
 * - API error responses (4xx, 5xx)
 * - Missing/malformed data handling
 * - Auth expiry and session recovery
 * - Offline mode and cache fallback
 * - Rate limit backoff
 * - Retry logic with exponential backoff
 * - Error boundary behavior
 * - Graceful degradation of non-critical features
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ErrorSeverity = 'critical' | 'degraded' | 'informational'

interface AppError {
  code: string
  message: string
  severity: ErrorSeverity
  retryable: boolean
  userMessage: string
  statusCode: number | null
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

interface RetryState {
  attempt: number
  nextDelayMs: number
  exhausted: boolean
}

interface OfflineFallback {
  route: string
  cachedData: boolean
  fallbackUI: string
  staleWhileRevalidate: boolean
}

interface ErrorBoundaryConfig {
  componentName: string
  fallbackUI: string
  reportsToSentry: boolean
  showRetryButton: boolean
  isolated: boolean
}

interface GracefulDegradation {
  feature: string
  criticalPath: boolean
  fallbackBehavior: string
  errorMessage: string
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

const ERROR_CODES: Record<string, AppError> = {
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    message: 'No network connection',
    severity: 'degraded',
    retryable: true,
    userMessage: 'You appear to be offline. Some features may be limited.',
    statusCode: null,
  },
  AUTH_EXPIRED: {
    code: 'AUTH_EXPIRED',
    message: 'Authentication token expired',
    severity: 'degraded',
    retryable: true,
    userMessage: 'Your session has expired. Please sign in again.',
    statusCode: 401,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    severity: 'informational',
    retryable: false,
    userMessage: "The page you're looking for doesn't exist.",
    statusCode: 404,
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    severity: 'degraded',
    retryable: true,
    userMessage: 'Please wait a moment before trying again.',
    statusCode: 429,
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    severity: 'critical',
    retryable: true,
    userMessage: 'Something went wrong. Please try again.',
    statusCode: 500,
  },
  INVALID_DATA: {
    code: 'INVALID_DATA',
    message: 'Malformed response data',
    severity: 'degraded',
    retryable: false,
    userMessage: 'We received unexpected data. Please refresh.',
    statusCode: null,
  },
  AI_UNAVAILABLE: {
    code: 'AI_UNAVAILABLE',
    message: 'Chat AI service unavailable',
    severity: 'degraded',
    retryable: true,
    userMessage: 'Chat is temporarily unavailable. Please try again later.',
    statusCode: 503,
  },
  SUPABASE_ERROR: {
    code: 'SUPABASE_ERROR',
    message: 'Database operation failed',
    severity: 'critical',
    retryable: true,
    userMessage: "We're having trouble saving your data. Please try again.",
    statusCode: 500,
  },
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Payment processing failed',
    severity: 'critical',
    retryable: false,
    userMessage:
      'Payment could not be processed. Please check your payment method.',
    statusCode: 402,
  },
  STORAGE_FULL: {
    code: 'STORAGE_FULL',
    message: 'Local storage quota exceeded',
    severity: 'degraded',
    retryable: false,
    userMessage: 'Storage is full. Some data may not be saved locally.',
    statusCode: null,
  },
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

const OFFLINE_FALLBACKS: OfflineFallback[] = [
  {
    route: '/',
    cachedData: true,
    fallbackUI: 'cached_home',
    staleWhileRevalidate: true,
  },
  {
    route: '/wake-up/devotional/*',
    cachedData: true,
    fallbackUI: 'cached_devotional',
    staleWhileRevalidate: true,
  },
  {
    route: '/soul-audit',
    cachedData: false,
    fallbackUI: 'offline_notice',
    staleWhileRevalidate: false,
  },
  {
    route: '/settings',
    cachedData: true,
    fallbackUI: 'cached_settings',
    staleWhileRevalidate: true,
  },
  {
    route: '/api/*',
    cachedData: false,
    fallbackUI: 'offline_error',
    staleWhileRevalidate: false,
  },
]

const ERROR_BOUNDARIES: ErrorBoundaryConfig[] = [
  {
    componentName: 'DevotionalReader',
    fallbackUI: 'reader_error',
    reportsToSentry: true,
    showRetryButton: true,
    isolated: true,
  },
  {
    componentName: 'ChatSidebar',
    fallbackUI: 'chat_error',
    reportsToSentry: true,
    showRetryButton: true,
    isolated: true,
  },
  {
    componentName: 'SoulAudit',
    fallbackUI: 'audit_error',
    reportsToSentry: true,
    showRetryButton: true,
    isolated: true,
  },
  {
    componentName: 'LeftRail',
    fallbackUI: 'rail_error',
    reportsToSentry: true,
    showRetryButton: false,
    isolated: true,
  },
  {
    componentName: 'App',
    fallbackUI: 'app_error',
    reportsToSentry: true,
    showRetryButton: true,
    isolated: false,
  },
]

const GRACEFUL_DEGRADATIONS: GracefulDegradation[] = [
  {
    feature: 'chat',
    criticalPath: false,
    fallbackBehavior: 'Hide FAB, show "Chat unavailable" toast',
    errorMessage: 'Chat is temporarily unavailable',
  },
  {
    feature: 'highlights',
    criticalPath: false,
    fallbackBehavior: 'Disable highlight tool, show info toast',
    errorMessage: 'Highlighting is temporarily unavailable',
  },
  {
    feature: 'push_notifications',
    criticalPath: false,
    fallbackBehavior: 'Fall back to in-app only',
    errorMessage: 'Push notifications unavailable',
  },
  {
    feature: 'analytics',
    criticalPath: false,
    fallbackBehavior: 'Silently skip analytics calls',
    errorMessage: '',
  },
  {
    feature: 'devotional_reader',
    criticalPath: true,
    fallbackBehavior: 'Show error boundary with retry',
    errorMessage: 'Unable to load devotional',
  },
  {
    feature: 'auth',
    criticalPath: true,
    fallbackBehavior: 'Redirect to login with error message',
    errorMessage: 'Authentication error. Please sign in again.',
  },
  {
    feature: 'soul_audit',
    criticalPath: true,
    fallbackBehavior: 'Show error boundary with retry',
    errorMessage: 'Unable to process audit',
  },
]

function computeRetryDelay(config: RetryConfig, attempt: number): RetryState {
  if (attempt >= config.maxRetries) {
    return { attempt, nextDelayMs: 0, exhausted: true }
  }
  const delay = Math.min(
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs,
  )
  return { attempt, nextDelayMs: delay, exhausted: false }
}

function shouldRetry(
  error: AppError,
  attempt: number,
  config: RetryConfig,
): boolean {
  if (!error.retryable) return false
  if (attempt >= config.maxRetries) return false
  return true
}

function getOfflineFallback(route: string): OfflineFallback | null {
  // Check exact match first, then wildcard
  const exact = OFFLINE_FALLBACKS.find((f) => f.route === route)
  if (exact) return exact
  const wildcard = OFFLINE_FALLBACKS.find((f) => {
    if (!f.route.endsWith('*')) return false
    const prefix = f.route.slice(0, -1)
    return route.startsWith(prefix)
  })
  return wildcard ?? null
}

function classifyError(statusCode: number | null): ErrorSeverity {
  if (statusCode === null) return 'degraded'
  if (statusCode >= 500) return 'critical'
  if (statusCode === 429) return 'degraded'
  if (statusCode === 401 || statusCode === 403) return 'degraded'
  if (statusCode === 404) return 'informational'
  if (statusCode >= 400) return 'informational'
  return 'informational'
}

function validateDevotionalData(data: Record<string, unknown>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (!data.slug || typeof data.slug !== 'string')
    errors.push('Missing or invalid slug')
  if (!data.title || typeof data.title !== 'string')
    errors.push('Missing or invalid title')
  if (!data.day || typeof data.day !== 'number')
    errors.push('Missing or invalid day')
  if (!data.modules || !Array.isArray(data.modules))
    errors.push('Missing or invalid modules')
  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Error codes and messages', () => {
  it('all errors have user-friendly messages', () => {
    for (const [, error] of Object.entries(ERROR_CODES)) {
      expect(error.userMessage.length).toBeGreaterThan(0)
      // User messages should not contain technical jargon
      expect(error.userMessage).not.toMatch(/null|undefined|exception|stack/i)
    }
  })

  it('all errors have severity classification', () => {
    const validSeverities: ErrorSeverity[] = [
      'critical',
      'degraded',
      'informational',
    ]
    for (const [, error] of Object.entries(ERROR_CODES)) {
      expect(validSeverities).toContain(error.severity)
    }
  })

  it('retryable flag set correctly for transient errors', () => {
    expect(ERROR_CODES.NETWORK_OFFLINE.retryable).toBe(true)
    expect(ERROR_CODES.AUTH_EXPIRED.retryable).toBe(true)
    expect(ERROR_CODES.RATE_LIMITED.retryable).toBe(true)
    expect(ERROR_CODES.SERVER_ERROR.retryable).toBe(true)
  })

  it('non-retryable for permanent errors', () => {
    expect(ERROR_CODES.NOT_FOUND.retryable).toBe(false)
    expect(ERROR_CODES.INVALID_DATA.retryable).toBe(false)
    expect(ERROR_CODES.PAYMENT_FAILED.retryable).toBe(false)
  })

  it('status codes match HTTP standards', () => {
    expect(ERROR_CODES.AUTH_EXPIRED.statusCode).toBe(401)
    expect(ERROR_CODES.NOT_FOUND.statusCode).toBe(404)
    expect(ERROR_CODES.RATE_LIMITED.statusCode).toBe(429)
    expect(ERROR_CODES.SERVER_ERROR.statusCode).toBe(500)
    expect(ERROR_CODES.AI_UNAVAILABLE.statusCode).toBe(503)
  })
})

describe('Retry logic with exponential backoff', () => {
  it('first retry after base delay', () => {
    const state = computeRetryDelay(DEFAULT_RETRY_CONFIG, 0)
    expect(state.nextDelayMs).toBe(1000) // 1000 * 2^0
    expect(state.exhausted).toBe(false)
  })

  it('second retry with doubled delay', () => {
    const state = computeRetryDelay(DEFAULT_RETRY_CONFIG, 1)
    expect(state.nextDelayMs).toBe(2000) // 1000 * 2^1
  })

  it('third retry with quadrupled delay', () => {
    const state = computeRetryDelay(DEFAULT_RETRY_CONFIG, 2)
    expect(state.nextDelayMs).toBe(4000) // 1000 * 2^2
  })

  it('exhausted after max retries', () => {
    const state = computeRetryDelay(DEFAULT_RETRY_CONFIG, 3)
    expect(state.exhausted).toBe(true)
  })

  it('delay capped at maxDelayMs', () => {
    const config: RetryConfig = {
      maxRetries: 10,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 3,
    }
    const state = computeRetryDelay(config, 5)
    expect(state.nextDelayMs).toBeLessThanOrEqual(5000)
  })

  it('should retry retryable errors within limit', () => {
    expect(shouldRetry(ERROR_CODES.SERVER_ERROR, 0, DEFAULT_RETRY_CONFIG)).toBe(
      true,
    )
    expect(shouldRetry(ERROR_CODES.SERVER_ERROR, 2, DEFAULT_RETRY_CONFIG)).toBe(
      true,
    )
  })

  it('should not retry past max retries', () => {
    expect(shouldRetry(ERROR_CODES.SERVER_ERROR, 3, DEFAULT_RETRY_CONFIG)).toBe(
      false,
    )
  })

  it('should not retry non-retryable errors', () => {
    expect(shouldRetry(ERROR_CODES.NOT_FOUND, 0, DEFAULT_RETRY_CONFIG)).toBe(
      false,
    )
    expect(
      shouldRetry(ERROR_CODES.PAYMENT_FAILED, 0, DEFAULT_RETRY_CONFIG),
    ).toBe(false)
  })
})

describe('Offline fallbacks', () => {
  it('home page has cached fallback', () => {
    const fallback = getOfflineFallback('/')
    expect(fallback).toBeTruthy()
    expect(fallback!.cachedData).toBe(true)
  })

  it('devotional pages have cached fallback', () => {
    const fallback = getOfflineFallback('/wake-up/devotional/identity-day-1')
    expect(fallback).toBeTruthy()
    expect(fallback!.cachedData).toBe(true)
    expect(fallback!.staleWhileRevalidate).toBe(true)
  })

  it('soul audit has no cache (requires API)', () => {
    const fallback = getOfflineFallback('/soul-audit')
    expect(fallback).toBeTruthy()
    expect(fallback!.cachedData).toBe(false)
    expect(fallback!.fallbackUI).toBe('offline_notice')
  })

  it('API routes show offline error', () => {
    const fallback = getOfflineFallback('/api/soul-audit')
    expect(fallback).toBeTruthy()
    expect(fallback!.fallbackUI).toBe('offline_error')
  })

  it('settings page has cached fallback', () => {
    const fallback = getOfflineFallback('/settings')
    expect(fallback).toBeTruthy()
    expect(fallback!.cachedData).toBe(true)
  })

  it('unknown routes return null', () => {
    const fallback = getOfflineFallback('/unknown-page-xyz')
    expect(fallback).toBeNull()
  })
})

describe('Error classification', () => {
  it('5xx errors are critical', () => {
    expect(classifyError(500)).toBe('critical')
    expect(classifyError(502)).toBe('critical')
    expect(classifyError(503)).toBe('critical')
  })

  it('429 is degraded', () => {
    expect(classifyError(429)).toBe('degraded')
  })

  it('401 and 403 are degraded', () => {
    expect(classifyError(401)).toBe('degraded')
    expect(classifyError(403)).toBe('degraded')
  })

  it('404 is informational', () => {
    expect(classifyError(404)).toBe('informational')
  })

  it('null status (network) is degraded', () => {
    expect(classifyError(null)).toBe('degraded')
  })
})

describe('Error boundaries', () => {
  it('critical components have error boundaries', () => {
    const components = ERROR_BOUNDARIES.map((b) => b.componentName)
    expect(components).toContain('DevotionalReader')
    expect(components).toContain('SoulAudit')
    expect(components).toContain('ChatSidebar')
    expect(components).toContain('App')
  })

  it('all boundaries report to Sentry', () => {
    for (const boundary of ERROR_BOUNDARIES) {
      expect(boundary.reportsToSentry).toBe(true)
    }
  })

  it('component boundaries are isolated', () => {
    const componentBoundaries = ERROR_BOUNDARIES.filter(
      (b) => b.componentName !== 'App',
    )
    for (const boundary of componentBoundaries) {
      expect(boundary.isolated).toBe(true)
    }
  })

  it('app-level boundary is not isolated', () => {
    const appBoundary = ERROR_BOUNDARIES.find((b) => b.componentName === 'App')
    expect(appBoundary!.isolated).toBe(false)
  })

  it('interactive components have retry buttons', () => {
    const reader = ERROR_BOUNDARIES.find(
      (b) => b.componentName === 'DevotionalReader',
    )
    const chat = ERROR_BOUNDARIES.find((b) => b.componentName === 'ChatSidebar')
    const audit = ERROR_BOUNDARIES.find((b) => b.componentName === 'SoulAudit')
    expect(reader!.showRetryButton).toBe(true)
    expect(chat!.showRetryButton).toBe(true)
    expect(audit!.showRetryButton).toBe(true)
  })

  it('all boundaries have fallback UI identifiers', () => {
    for (const boundary of ERROR_BOUNDARIES) {
      expect(boundary.fallbackUI.length).toBeGreaterThan(0)
    }
  })
})

describe('Graceful degradation', () => {
  it('non-critical features degrade without crashing', () => {
    const nonCritical = GRACEFUL_DEGRADATIONS.filter((g) => !g.criticalPath)
    expect(nonCritical.length).toBeGreaterThanOrEqual(3)
    for (const feature of nonCritical) {
      expect(feature.fallbackBehavior.length).toBeGreaterThan(0)
    }
  })

  it('critical features show error boundaries', () => {
    const critical = GRACEFUL_DEGRADATIONS.filter((g) => g.criticalPath)
    for (const feature of critical) {
      expect(feature.fallbackBehavior).toMatch(/error boundary|redirect/i)
    }
  })

  it('chat degrades to hidden FAB', () => {
    const chat = GRACEFUL_DEGRADATIONS.find((g) => g.feature === 'chat')
    expect(chat!.criticalPath).toBe(false)
    expect(chat!.fallbackBehavior).toContain('Hide FAB')
  })

  it('analytics degrades silently', () => {
    const analytics = GRACEFUL_DEGRADATIONS.find(
      (g) => g.feature === 'analytics',
    )
    expect(analytics!.criticalPath).toBe(false)
    expect(analytics!.errorMessage).toBe('')
  })

  it('auth failure redirects to login', () => {
    const auth = GRACEFUL_DEGRADATIONS.find((g) => g.feature === 'auth')
    expect(auth!.criticalPath).toBe(true)
    expect(auth!.fallbackBehavior).toContain('Redirect to login')
  })

  it('devotional reader is critical path', () => {
    const reader = GRACEFUL_DEGRADATIONS.find(
      (g) => g.feature === 'devotional_reader',
    )
    expect(reader!.criticalPath).toBe(true)
  })
})

describe('Data validation', () => {
  it('valid devotional data passes', () => {
    const data = {
      slug: 'identity-day-1',
      title: 'Day 1',
      day: 1,
      modules: ['scripture', 'teaching'],
    }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('missing slug fails', () => {
    const data = { title: 'Day 1', day: 1, modules: [] }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid slug')
  })

  it('missing title fails', () => {
    const data = { slug: 'test', day: 1, modules: [] }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid title')
  })

  it('missing day fails', () => {
    const data = { slug: 'test', title: 'Test', modules: [] }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid day')
  })

  it('non-array modules fails', () => {
    const data = { slug: 'test', title: 'Test', day: 1, modules: 'scripture' }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid modules')
  })

  it('collects multiple errors', () => {
    const data = {} as Record<string, unknown>
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })

  it('wrong types fail validation', () => {
    const data = { slug: 123, title: null, day: 'one', modules: {} }
    const result = validateDevotionalData(data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })
})
