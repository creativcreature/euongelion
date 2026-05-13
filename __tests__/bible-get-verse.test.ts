import { describe, expect, it } from 'vitest'
import { getVerse, clearVerseCache } from '@/lib/bible/getVerse'
import { BIBLE_TRANSLATION_CODES } from '@/lib/bible/translations'

describe('getVerse', () => {
  it('returns John 3:16 from every translation', async () => {
    clearVerseCache()
    for (const code of BIBLE_TRANSLATION_CODES) {
      const result = await getVerse('John 3:16', code)
      expect(result.translation).toBe(code)
      expect(result.canonical).toBe('John 3:16')
      expect(result.verses).toHaveLength(1)
      expect(result.verses[0].chapter).toBe(3)
      expect(result.verses[0].verse).toBe(16)
      expect(result.text.length).toBeGreaterThan(40)
      // every translation says "God"
      expect(/god/i.test(result.text)).toBe(true)
    }
  })

  it('returns the 1769 Cambridge KJV for John 3:16, not 1611', async () => {
    const result = await getVerse('John 3:16', 'KJV')
    expect(result.text).toContain('only begotten')
    expect(result.text.toLowerCase()).not.toContain('onely')
  })

  it('returns multiple verses for a range', async () => {
    const result = await getVerse('Genesis 1:1-3', 'BSB')
    expect(result.verses).toHaveLength(3)
    expect(result.verses[0].verse).toBe(1)
    expect(result.verses[2].verse).toBe(3)
  })

  it('returns whole chapters when no verse is given', async () => {
    const result = await getVerse('Psalm 23', 'KJV')
    expect(result.verses.length).toBeGreaterThanOrEqual(6)
    expect(result.verses[0].verse).toBe(1)
  })

  it('handles single-chapter books', async () => {
    const result = await getVerse('Jude 3', 'KJV')
    expect(result.verses).toHaveLength(1)
    expect(result.verses[0].chapter).toBe(1)
    expect(result.verses[0].verse).toBe(3)
  })

  it('throws on unknown translation', async () => {
    await expect(
      // @ts-expect-error testing invalid input at runtime
      getVerse('John 3:16', 'NIV'),
    ).rejects.toThrow(/Unknown Bible translation/)
  })

  it('throws on unparseable reference', async () => {
    await expect(getVerse('not a real reference', 'BSB')).rejects.toThrow(
      /Could not parse/,
    )
  })
})
