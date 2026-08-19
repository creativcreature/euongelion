import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDownloadsStore } from '@/stores/downloadsStore'

const root = process.cwd()
const sw = readFileSync(path.join(root, 'public/sw.js'), 'utf8')
const registration = readFileSync(
  path.join(root, 'src/components/ServiceWorkerRegistration.tsx'),
  'utf8',
)

/**
 * SA-101 — downloads must survive a deploy.
 *
 * Two independent sweeps delete caches on every release: the worker's own
 * `activate` handler, and the client's version-mismatch clear. Both match on a
 * name prefix, so a download bucket that is not explicitly exempted from BOTH
 * is silently thrown away the next time anything ships — and the reader who
 * saved a series for a flight has no way to connect its disappearance to a
 * deploy. This project has already been bitten once by these two files drifting
 * apart (SW_VERSION sat nine releases behind CACHE_NAME), so the agreement is
 * pinned here rather than trusted to a comment.
 */
describe('the downloads cache contract', () => {
  const name = 'euangelion-downloads'

  it('is named identically in the worker and the client', () => {
    expect(sw).toContain(`const DOWNLOADS_CACHE = '${name}'`)
    expect(registration).toContain(`const DOWNLOADS_CACHE = '${name}'`)
  })

  it('is not versioned, so a deploy cannot rotate it away', () => {
    expect(name).not.toMatch(/v\d+/)
  })

  it('is exempted from the worker’s activate purge', () => {
    const activate = sw.slice(sw.indexOf("addEventListener('activate'"))
    expect(activate).toContain('key !== DOWNLOADS_CACHE')
  })

  it('is exempted from the client’s version-mismatch clear', () => {
    expect(registration).toContain('key !== DOWNLOADS_CACHE')
  })

  it('serves partial content from cached bytes', () => {
    // A cached Response is a 200 with the whole body. Handing that to a media
    // element that asked for a range makes iOS refuse to seek, so the worker
    // has to slice it and answer 206 itself.
    expect(sw).toContain('status: 206')
    expect(sw).toContain("'x-audio-origin': 'downloaded'")
    // And an unsatisfiable range is answered honestly, not with the whole file.
    expect(sw).toContain('status: 416')
  })
})

describe('the downloads index', () => {
  beforeEach(() => useDownloadsStore.setState({ states: {}, hydrated: false }))

  it('tracks a download through its states', () => {
    const src = '/audio/a.m4a?v=1'
    useDownloadsStore.getState().setState(src, 'downloading')
    expect(useDownloadsStore.getState().states[src]).toBe('downloading')
    useDownloadsStore.getState().setState(src, 'done')
    expect(useDownloadsStore.getState().states[src]).toBe('done')
  })

  it('replaces the whole index when the worker reports what it holds', () => {
    useDownloadsStore.getState().setState('/audio/stale.m4a', 'done')
    useDownloadsStore.getState().setAll(['/audio/a.m4a', '/audio/b.m4a'])
    const { states, hydrated } = useDownloadsStore.getState()
    // The cache is the truth: anything it did not report is gone, because
    // showing a reading as saved that is no longer there is the worse failure.
    expect(Object.keys(states).sort()).toEqual(['/audio/a.m4a', '/audio/b.m4a'])
    expect(hydrated).toBe(true)
  })

  it('forgets a removed download', () => {
    useDownloadsStore.getState().setAll(['/audio/a.m4a'])
    useDownloadsStore.getState().remove('/audio/a.m4a')
    expect(useDownloadsStore.getState().states['/audio/a.m4a']).toBeUndefined()
  })
})
