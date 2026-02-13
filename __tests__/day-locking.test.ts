import { afterEach, describe, expect, it } from 'vitest'
import {
  DAY_LOCKING_COOKIE,
  getDefaultDayLockingEnabled,
  isDayLockingEnabledForRequest,
  serializeDayLockingCookie,
} from '@/lib/day-locking'

const originalDefault = process.env.DAY_LOCKING_DEFAULT

function requestWithCookie(value?: string) {
  return {
    cookies: {
      get(name: string) {
        if (name !== DAY_LOCKING_COOKIE || value === undefined) return undefined
        return { value }
      },
    },
  }
}

afterEach(() => {
  if (originalDefault === undefined) {
    delete process.env.DAY_LOCKING_DEFAULT
  } else {
    process.env.DAY_LOCKING_DEFAULT = originalDefault
  }
})

describe('day locking toggle', () => {
  it('defaults to off when env is not set', () => {
    delete process.env.DAY_LOCKING_DEFAULT
    expect(getDefaultDayLockingEnabled()).toBe(false)
  })

  it('respects cookie overrides', () => {
    process.env.DAY_LOCKING_DEFAULT = 'off'
    expect(isDayLockingEnabledForRequest(requestWithCookie('on'))).toBe(true)
    expect(isDayLockingEnabledForRequest(requestWithCookie('off'))).toBe(false)
  })

  it('falls back to env default when cookie is missing', () => {
    process.env.DAY_LOCKING_DEFAULT = 'on'
    expect(isDayLockingEnabledForRequest(requestWithCookie())).toBe(true)
  })

  it('serializes cookie correctly', () => {
    expect(serializeDayLockingCookie(true)).toContain(
      `${DAY_LOCKING_COOKIE}=on`,
    )
    expect(serializeDayLockingCookie(false)).toContain(
      `${DAY_LOCKING_COOKIE}=off`,
    )
  })
})
