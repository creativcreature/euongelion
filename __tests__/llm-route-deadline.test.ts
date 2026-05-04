import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isAbortError,
  LLM_ROUTE_DEADLINE_MS,
  withAbortDeadline,
  withModelUsedHeader,
} from '@/lib/api-security'

describe('LLM_ROUTE_DEADLINE_MS', () => {
  it('is set with headroom under the 30s Workers wall-clock cap', () => {
    expect(LLM_ROUTE_DEADLINE_MS).toBeGreaterThan(0)
    expect(LLM_ROUTE_DEADLINE_MS).toBeLessThan(30_000)
    // Need at least a couple seconds of headroom to surface a clean 504.
    expect(30_000 - LLM_ROUTE_DEADLINE_MS).toBeGreaterThanOrEqual(2_000)
  })
})

describe('withAbortDeadline', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the inner value when the work completes before the deadline', async () => {
    const promise = withAbortDeadline(1000, async (signal) => {
      expect(signal.aborted).toBe(false)
      return 'ok'
    })
    await expect(promise).resolves.toBe('ok')
  })

  it('rejects with an AbortError when the deadline fires first', async () => {
    const promise = withAbortDeadline(50, (signal) => {
      return new Promise<string>((_, reject) => {
        signal.addEventListener('abort', () => {
          const err = new Error('aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })
    const settled = promise.catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(60)
    const error = (await settled) as Error
    expect(isAbortError(error)).toBe(true)
  })

  it('passes a fresh AbortSignal that fires once the deadline elapses', async () => {
    let observedAborted: boolean | null = null
    const promise = withAbortDeadline(20, async (signal) => {
      // Schedule a microtask that observes the signal after 50ms (after
      // the deadline). We resolve after that observation so the helper
      // has a chance to abort the signal first.
      await new Promise((resolve) => setTimeout(resolve, 50))
      observedAborted = signal.aborted
      return 'late'
    })
    await vi.advanceTimersByTimeAsync(60)
    await promise
    expect(observedAborted).toBe(true)
  })

  it('clears the timer in finally so successful runs do not leak setTimeout', async () => {
    const setSpy = vi.spyOn(globalThis, 'setTimeout')
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    await withAbortDeadline(10_000, async () => 'fast')
    expect(setSpy).toHaveBeenCalled()
    expect(clearSpy).toHaveBeenCalled()
    setSpy.mockRestore()
    clearSpy.mockRestore()
  })
})

describe('withModelUsedHeader', () => {
  it('sets the X-Model-Used header when a provider name is given', () => {
    const response = new Response(null, { status: 200 })
    withModelUsedHeader(response, 'anthropic')
    expect(response.headers.get('X-Model-Used')).toBe('anthropic')
  })

  it('does not set the header when provider is null/undefined/empty', () => {
    const r1 = new Response(null, { status: 200 })
    withModelUsedHeader(r1, null)
    expect(r1.headers.get('X-Model-Used')).toBeNull()

    const r2 = new Response(null, { status: 200 })
    withModelUsedHeader(r2, undefined)
    expect(r2.headers.get('X-Model-Used')).toBeNull()

    const r3 = new Response(null, { status: 200 })
    withModelUsedHeader(r3, '')
    expect(r3.headers.get('X-Model-Used')).toBeNull()
  })

  it('returns the same response instance for chaining', () => {
    const response = new Response(null, { status: 200 })
    expect(withModelUsedHeader(response, 'google')).toBe(response)
  })
})

describe('isAbortError', () => {
  it('returns true for an Error with name AbortError', () => {
    const err = new Error('x')
    err.name = 'AbortError'
    expect(isAbortError(err)).toBe(true)
  })

  it('returns true for a DOMException-like object with name AbortError', () => {
    expect(isAbortError({ name: 'AbortError' })).toBe(true)
  })

  it('returns false for any other error', () => {
    expect(isAbortError(new Error('plain'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    expect(isAbortError(undefined)).toBe(false)
    expect(isAbortError({ message: 'no name' })).toBe(false)
    expect(isAbortError('a string')).toBe(false)
  })
})
