import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getWordOfTheDay } from '@/lib/home/word-of-the-day'
import { generateProverb } from '@/lib/edition/generators/proverb'
import { effectiveEditionDate } from '@/lib/edition/deadline'

/**
 * Homepage "the Word leads" rebuild (founder-directed 2026-08-20).
 *
 * The Word block is the Daily Bread's daily PROVERB, computed with the SAME
 * deterministic algorithm the paper's generator uses, from the committed BSB
 * corpus — not from edition rows (the preview run proved published proverb
 * rows cannot be relied on to exist for a given date), and not the edition's
 * `verse` kind (the weekly memory verse repeats seven days by design).
 */
describe('word of the day resolver', () => {
  const loadRealBook = async () =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public', 'bibles', 'BSB', 'PRO.json'),
        'utf8',
      ),
    ) as Record<string, Record<string, string>>

  it('resolves a BSB proverb deterministically for the edition date', async () => {
    const now = new Date('2026-08-20T15:00:00Z')
    const a = await getWordOfTheDay(loadRealBook, now)
    const b = await getWordOfTheDay(loadRealBook, now)
    expect(a).toEqual(b)
    expect(a.reference).toMatch(/^Proverbs \d+:\d+$/)
    expect(a.text.split(/\s+/).length).toBeGreaterThanOrEqual(12)
    expect(a.translation).toBe('BSB')
  })

  it('changes with the edition date — consecutive days differ', async () => {
    const day1 = await getWordOfTheDay(
      loadRealBook,
      new Date('2026-08-20T15:00:00Z'),
    )
    const day2 = await getWordOfTheDay(
      loadRealBook,
      new Date('2026-08-21T15:00:00Z'),
    )
    expect(day1.reference).not.toBe(day2.reference)
  })

  it("prints EXACTLY what the paper prints — parity with the edition's generator", async () => {
    const now = new Date('2026-08-20T15:00:00Z')
    const editionDate = new Date(`${effectiveEditionDate(now)}T00:00:00Z`)
    const [paperRow] = await generateProverb(editionDate)
    const word = await getWordOfTheDay(loadRealBook, now)
    expect(word.reference).toBe(paperRow.payload.reference)
    expect(word.text).toBe(paperRow.payload.text)
  })

  it('throws when the corpus cannot be loaded — never silently empty', async () => {
    await expect(
      getWordOfTheDay(async () => {
        throw new Error('corpus fetch failed')
      }),
    ).rejects.toThrow(/corpus/i)
  })
})

describe('homepage structure contract (the Word leads)', () => {
  const clientPath = path.join(process.cwd(), 'src', 'app', 'HomeClient.tsx')
  const pagePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')

  it('page.tsx is a thin ISR server wrapper; the client body is HomeClient', () => {
    const page = fs.readFileSync(pagePath, 'utf8')
    expect(page).not.toContain("'use client'")
    expect(page).toContain('revalidate')
    expect(page).toContain('HomeClient')
    expect(page).toContain('getWordOfTheDay')
    const client = fs.readFileSync(clientPath, 'utf8')
    expect(client).toContain("'use client'")
  })

  it('blocks appear in the ruled order: word, audit, grace, reading, scale, one action', () => {
    const client = fs.readFileSync(clientPath, 'utf8')
    const order = [
      'homepage-hero-banner',
      'homepage-resume-banner',
      'homepage-word-of-day',
      'homepage-soul-audit',
      'homepage-grace-line',
      'homepage-featured-devotional',
      'homepage-scale-line',
      'homepage-howitworks',
      'homepage-one-action',
    ]
    const positions = order.map((cls) => {
      const i = client.indexOf(cls)
      expect(i, `${cls} missing from HomeClient`).toBeGreaterThan(-1)
      return i
    })
    for (let i = 1; i < positions.length; i += 1) {
      expect(
        positions[i],
        `${order[i]} should come after ${order[i - 1]}`,
      ).toBeGreaterThan(positions[i - 1])
    }
  })

  it('the deleted blocks are gone: ladder, trust rows, what-is, old CTA', () => {
    const client = fs.readFileSync(clientPath, 'utf8')
    expect(client).not.toContain('homepage-action-ladder')
    expect(client).not.toContain('homepage-trust-row')
    expect(client).not.toContain('homepage-what-is-this')
    expect(client).not.toContain('READY TO BEGIN?')
    // The closing block makes exactly one offer — no secondary link.
    expect(client).not.toContain('Or — start the Soul Audit')
  })

  it('FAQ leads with the sign-up and missed-day answers', () => {
    const client = fs.readFileSync(clientPath, 'utf8')
    const signup = client.indexOf('Do I need to sign up first?')
    const missed = client.indexOf('What if I miss a day?')
    const skeptical = client.indexOf('What if I am skeptical')
    expect(signup).toBeGreaterThan(-1)
    expect(signup).toBeLessThan(missed)
    expect(missed).toBeLessThan(skeptical)
  })

  it('the scale line is computed, never hand-typed', () => {
    const client = fs.readFileSync(clientPath, 'utf8')
    expect(client).toContain('DEVOTIONAL_TEASERS')
    expect(client).toContain('AUDIO_HOURS')
    expect(client).toContain('SERIES_COUNT')
    expect(client).not.toMatch(/575 readings/)
  })
})
