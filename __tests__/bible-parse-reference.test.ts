import { describe, expect, it } from 'vitest'
import { parseReference } from '@/lib/bible/parseReference'

describe('parseReference', () => {
  it('parses single verses with full book names', () => {
    const r = parseReference('John 3:16')
    expect(r).not.toBeNull()
    expect(r!.book).toBe('JHN')
    expect(r!.bookName).toBe('John')
    expect(r!.startChapter).toBe(3)
    expect(r!.startVerse).toBe(16)
    expect(r!.endChapter).toBe(3)
    expect(r!.endVerse).toBe(16)
    expect(r!.canonical).toBe('John 3:16')
  })

  it('parses verse ranges with hyphen', () => {
    const r = parseReference('Genesis 1:1-3')!
    expect(r.book).toBe('GEN')
    expect(r.startChapter).toBe(1)
    expect(r.endVerse).toBe(3)
    expect(r.canonical).toBe('Genesis 1:1-3')
  })

  it('parses verse ranges with em-dash', () => {
    const r = parseReference('1 Cor 13:4–7')!
    expect(r.book).toBe('1CO')
    expect(r.startVerse).toBe(4)
    expect(r.endVerse).toBe(7)
    expect(r.canonical).toBe('1 Corinthians 13:4-7')
  })

  it('parses cross-chapter ranges', () => {
    const r = parseReference('Genesis 1:31-2:3')!
    expect(r.startChapter).toBe(1)
    expect(r.startVerse).toBe(31)
    expect(r.endChapter).toBe(2)
    expect(r.endVerse).toBe(3)
    expect(r.canonical).toBe('Genesis 1:31-2:3')
  })

  it('parses whole chapters when verse is omitted', () => {
    const r = parseReference('Ps 23')!
    expect(r.book).toBe('PSA')
    expect(r.startChapter).toBe(23)
    expect(r.endChapter).toBe(23)
    expect(r.startVerse).toBe(0)
    expect(r.endVerse).toBe(0)
    expect(r.canonical).toBe('Psalms 23')
  })

  it('handles single-chapter books with verse-only references', () => {
    const obadiah = parseReference('Obadiah 5')!
    expect(obadiah.book).toBe('OBA')
    expect(obadiah.startChapter).toBe(1)
    expect(obadiah.startVerse).toBe(5)

    const jude = parseReference('Jude 3')!
    expect(jude.book).toBe('JUD')
    expect(jude.startChapter).toBe(1)
    expect(jude.startVerse).toBe(3)

    const thirdJohn = parseReference('3 John 14')!
    expect(thirdJohn.book).toBe('3JN')
    expect(thirdJohn.startVerse).toBe(14)
  })

  it('handles single-chapter book ranges', () => {
    const r = parseReference('Philemon 1-3')!
    expect(r.book).toBe('PHM')
    expect(r.startVerse).toBe(1)
    expect(r.endVerse).toBe(3)
    expect(r.canonical).toBe('Philemon 1-3')
  })

  it('handles common book abbreviations', () => {
    expect(parseReference('Matt 5:3')!.book).toBe('MAT')
    expect(parseReference('Mt 5:3')!.book).toBe('MAT')
    expect(parseReference('Rev. 21:4')!.book).toBe('REV')
    expect(parseReference('1 Pet 5:7')!.book).toBe('1PE')
    expect(parseReference('Song of Solomon 2:1')!.book).toBe('SNG')
    expect(parseReference('Song of Songs 2:1')!.book).toBe('SNG')
  })

  it('handles roman-numeral book numbers', () => {
    expect(parseReference('I Peter 5:7')!.book).toBe('1PE')
    expect(parseReference('II Corinthians 5:17')!.book).toBe('2CO')
    expect(parseReference('III John 4')!.book).toBe('3JN')
  })

  it('returns null for unrecognized input', () => {
    expect(parseReference('gibberish')).toBeNull()
    expect(parseReference('')).toBeNull()
    expect(parseReference('NotABook 1:1')).toBeNull()
  })

  it('rejects out-of-range chapter numbers', () => {
    // Genesis has 50 chapters
    expect(parseReference('Genesis 51:1')).toBeNull()
    // John has 21 chapters
    expect(parseReference('John 22:1')).toBeNull()
  })

  it('rejects backwards ranges', () => {
    expect(parseReference('John 3:16-3:1')).toBeNull()
  })
})
