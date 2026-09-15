/**
 * Daily Bread V2 editorial clock (SA-142 / F-184): the 7am New York rollover,
 * DST on both sides, parity with the SA-114 rule, strict date slugs, and the
 * scheduler's build window.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { effectiveEditionDate } from '@/lib/edition/deadline'
import { DAILY_BREAD_PUBLISH_CRON, publishDueEdition } from '@/lib/daily-bread/scheduled'
import {
  addDays,
  editorialDate,
  fixedClock,
  isValidDateSlug,
  rolloverInstant,
  schedulePlan,
  zoneOffsetMinutes,
} from '@/lib/daily-bread/time'

describe('editorial clock', () => {
  it('flips at 07:00 EDT (11:00Z) in summer and 07:00 EST (12:00Z) in winter', () => {
    expect(editorialDate(new Date('2026-09-14T10:59:59Z'))).toBe('2026-09-13')
    expect(editorialDate(new Date('2026-09-14T11:00:00Z'))).toBe('2026-09-14')
    expect(editorialDate(new Date('2026-01-15T11:59:59Z'))).toBe('2026-01-14')
    expect(editorialDate(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15')
  })

  it('rollover instants are 11:00Z in EDT and 12:00Z in EST, including DST change days', () => {
    expect(rolloverInstant('2026-09-14').toISOString()).toBe('2026-09-14T11:00:00.000Z')
    expect(rolloverInstant('2026-01-15').toISOString()).toBe('2026-01-15T12:00:00.000Z')
    // 2026 DST: starts Mar 8, ends Nov 1 (both at 2am local, before 7am).
    expect(rolloverInstant('2026-03-08').toISOString()).toBe('2026-03-08T11:00:00.000Z')
    expect(rolloverInstant('2026-11-01').toISOString()).toBe('2026-11-01T12:00:00.000Z')
    expect(zoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'))).toBe(-240)
    expect(zoneOffsetMinutes(new Date('2026-12-01T12:00:00Z'))).toBe(-300)
  })

  it('agrees with the SA-114 effectiveEditionDate every 37 minutes across a year', () => {
    const start = Date.parse('2026-01-01T00:00:00Z')
    const end = Date.parse('2027-01-01T00:00:00Z')
    for (let t = start; t < end; t += 37 * 60_000) {
      const at = new Date(t)
      expect(editorialDate(at)).toBe(effectiveEditionDate(at))
    }
  })

  it('accepts only real calendar dates as slugs', () => {
    expect(isValidDateSlug('2026-09-14')).toBe(true)
    expect(isValidDateSlug('2028-02-29')).toBe(true)
    for (const bad of ['2026-02-30', '2026-13-01', '2026-9-14', '20260914', '2026-09-14/../x', '', null, 42, '1999-12-31']) {
      expect(isValidDateSlug(bad)).toBe(false)
    }
    expect(() => addDays('nope', 1)).toThrow()
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })

  it('the build window opens 14 hours before the next rollover', () => {
    const outside = schedulePlan(fixedClock('2026-09-14T11:05:00Z'))
    expect(outside).toMatchObject({ liveDate: '2026-09-14', nextDate: '2026-09-15', inBuildWindow: false })
    const inside = schedulePlan(fixedClock('2026-09-14T23:30:00Z'))
    expect(inside).toMatchObject({ liveDate: '2026-09-14', nextDate: '2026-09-15', inBuildWindow: true })
  })

  it('both evening cron runs (22:15 and 02:15 UTC) fall inside the window in EDT and EST', () => {
    expect(schedulePlan(fixedClock('2026-09-14T22:15:00Z')).inBuildWindow).toBe(true)
    expect(schedulePlan(fixedClock('2026-09-15T02:15:00Z')).inBuildWindow).toBe(true)
    expect(schedulePlan(fixedClock('2026-01-14T22:15:00Z')).inBuildWindow).toBe(true)
    expect(schedulePlan(fixedClock('2026-01-15T02:15:00Z')).inBuildWindow).toBe(true)
  })
})

describe('the Worker cron publishes on the minute (plan §19)', () => {
  const SECRET = 'internal-secret-for-test-0123456789'

  it('fires inside the rollover hour in both EDT and EST', () => {
    const [minutes, hours] = DAILY_BREAD_PUBLISH_CRON.split(' ')
    const firings = hours.split(',').flatMap((h) => minutes.split(',').map((m) => ({ h: Number(h), m: Number(m) })))
    const firstLive = (day: string) =>
      firings
        .map(({ h, m }) => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`))
        .filter((at) => editorialDate(at) === day)
        .sort((a, b) => a.getTime() - b.getTime())[0]
    // EDT: first live firing 11:01Z (07:01). EST: 12:01Z (07:01).
    expect(firstLive('2026-09-14')?.toISOString()).toBe('2026-09-14T11:01:00.000Z')
    expect(firstLive('2026-12-01')?.toISOString()).toBe('2026-12-01T12:01:00.000Z')
  })

  it('matches wrangler.jsonc exactly', () => {
    const raw = readFileSync(path.join(process.cwd(), 'wrangler.jsonc'), 'utf8')
    const config = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '')) as { main: string; triggers?: { crons?: string[] } }
    expect(config.triggers?.crons).toEqual([DAILY_BREAD_PUBLISH_CRON])
    expect(config.main).toBe('worker-entry.mjs')
    expect(readFileSync(path.join(process.cwd(), 'worker-entry.mjs'), 'utf8')).toContain('controller.cron !== DAILY_BREAD_PUBLISH_CRON')
  })

  it('posts the live editorial date to the internal publish route and reports the result', async () => {
    const seen: Request[] = []
    const lines: string[] = []
    const out = await publishDueEdition({
      now: new Date('2026-09-14T11:01:00Z'),
      appUrl: 'https://euangelion.app/',
      secret: SECRET,
      log: (l) => lines.push(l),
      fetch: async (request) => {
        seen.push(request)
        return Response.json({ ok: true, result: 'published', issue: 2 })
      },
    })
    expect(out).toEqual({ date: '2026-09-14', status: 200, result: 'published', issue: 2 })
    expect(seen[0].url).toBe('https://euangelion.app/api/admin/daily-bread/publish')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].headers.get('X-Internal-Secret')).toBe(SECRET)
    expect(await seen[0].json()).toEqual({ date: '2026-09-14' })
    expect(lines.join('\n')).not.toContain(SECRET)
    expect(JSON.parse(lines[0])).toMatchObject({ event: 'cron_publish', result: 'published', issue: 2 })

    // Before the EST rollover the live date is still yesterday's paper.
    const early = await publishDueEdition({
      now: new Date('2026-12-01T11:01:00Z'),
      appUrl: 'https://euangelion.app',
      secret: SECRET,
      log: () => {},
      fetch: async () => Response.json({ ok: true, result: 'already_published', issue: 80 }),
    })
    expect(early).toMatchObject({ date: '2026-11-30', result: 'already_published' })
  })

  it('reports failures instead of throwing: no secret, network error, refusal', async () => {
    let calls = 0
    const noSecret = await publishDueEdition({
      now: new Date('2026-09-14T11:01:00Z'),
      appUrl: 'https://euangelion.app',
      secret: undefined,
      log: () => {},
      fetch: async () => {
        calls++
        return new Response('')
      },
    })
    expect(noSecret.result).toBe('no-internal-secret')
    expect(calls).toBe(0)
    const down = await publishDueEdition({
      now: new Date('2026-09-14T11:01:00Z'),
      appUrl: 'https://euangelion.app',
      secret: SECRET,
      log: () => {},
      fetch: async () => {
        throw new TypeError('fetch failed')
      },
    })
    expect(down).toMatchObject({ status: 0, result: 'fetch-failed:TypeError' })
    const refused = await publishDueEdition({
      now: new Date('2026-09-14T11:01:00Z'),
      appUrl: 'https://euangelion.app',
      secret: SECRET,
      log: () => {},
      fetch: async () => Response.json({ error: 'Forbidden.', code: 'INTERNAL_SECRET_REQUIRED' }, { status: 403 }),
    })
    expect(refused).toMatchObject({ status: 403, result: 'INTERNAL_SECRET_REQUIRED' })
  })

  it('a firing that cannot publish is an error inside the press grace window and critical past it (plan §31)', async () => {
    const levelAt = async (now: string, body: object, status = 200) => {
      const lines: string[] = []
      await publishDueEdition({
        now: new Date(now),
        appUrl: 'https://euangelion.app',
        secret: SECRET,
        log: (line) => lines.push(line),
        fetch: async () => Response.json(body, { status }),
      })
      return JSON.parse(lines[0]).level
    }
    expect(await levelAt('2026-09-14T11:01:00Z', { result: 'published', issue: 2 })).toBe('info')
    expect(await levelAt('2026-09-14T11:45:00Z', { result: 'already_published', issue: 2 })).toBe('info')
    expect(await levelAt('2026-09-14T11:01:00Z', { result: 'not_ready' })).toBe('error')
    expect(await levelAt('2026-09-14T11:15:00Z', { result: 'not_ready' })).toBe('error')
    expect(await levelAt('2026-09-14T11:45:00Z', { result: 'not_ready' })).toBe('critical')
    // EST: 7am is 12:00 UTC, so 12:45 is past the window and 11:45 is the day before's hour.
    expect(await levelAt('2026-12-01T12:45:00Z', { error: 'Publish failed.', code: 'PUBLISH_FAILED' }, 500)).toBe('critical')
  })
})
