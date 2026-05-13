import { describe, expect, it } from 'vitest'
import {
  BIBLE_TRANSLATION_CODES,
  BIBLE_TRANSLATIONS,
  DEFAULT_BIBLE_TRANSLATION,
  isBibleTranslationCode,
  getTranslationMeta,
} from '@/lib/bible/translations'

describe('BIBLE_TRANSLATIONS metadata', () => {
  it('exposes exactly the 7 free translations', () => {
    expect(BIBLE_TRANSLATION_CODES).toEqual([
      'BSB',
      'WEB',
      'KJV',
      'ASV',
      'YLT',
      'DARBY',
      'BBE',
    ])
  })

  it('defaults to BSB', () => {
    expect(DEFAULT_BIBLE_TRANSLATION).toBe('BSB')
  })

  it('does not include any commercially-licensed translations', () => {
    const banned = new Set(['NIV', 'ESV', 'NASB', 'NLT', 'MSG'])
    for (const code of BIBLE_TRANSLATION_CODES) {
      expect(banned.has(code)).toBe(false)
    }
  })

  it('has metadata for every code', () => {
    for (const code of BIBLE_TRANSLATION_CODES) {
      const meta = BIBLE_TRANSLATIONS[code]
      expect(meta).toBeDefined()
      expect(meta.code).toBe(code)
      expect(meta.name.length).toBeGreaterThan(0)
      expect(meta.license.length).toBeGreaterThan(0)
      expect(meta.licenseShort.length).toBeGreaterThan(0)
      expect(meta.year).toBeGreaterThan(1500)
    }
  })

  it('records the correct license per translation', () => {
    expect(BIBLE_TRANSLATIONS.BSB.licenseShort).toBe('CC0')
    expect(BIBLE_TRANSLATIONS.WEB.licenseShort).toBe('PD')
    expect(BIBLE_TRANSLATIONS.KJV.licenseShort).toBe('PD (US)')
    expect(BIBLE_TRANSLATIONS.ASV.licenseShort).toBe('PD')
    expect(BIBLE_TRANSLATIONS.YLT.licenseShort).toBe('PD')
    expect(BIBLE_TRANSLATIONS.DARBY.licenseShort).toBe('PD')
    expect(BIBLE_TRANSLATIONS.BBE.licenseShort).toBe('PD (US)')
  })

  it('uses the 1769 KJV edition year', () => {
    expect(BIBLE_TRANSLATIONS.KJV.year).toBe(1769)
  })
})

describe('isBibleTranslationCode', () => {
  it('accepts valid codes', () => {
    expect(isBibleTranslationCode('BSB')).toBe(true)
    expect(isBibleTranslationCode('KJV')).toBe(true)
  })

  it('rejects legacy paid-translation codes', () => {
    expect(isBibleTranslationCode('NIV')).toBe(false)
    expect(isBibleTranslationCode('ESV')).toBe(false)
    expect(isBibleTranslationCode('NASB')).toBe(false)
    expect(isBibleTranslationCode('NLT')).toBe(false)
    expect(isBibleTranslationCode('MSG')).toBe(false)
  })

  it('rejects non-string input', () => {
    expect(isBibleTranslationCode(undefined)).toBe(false)
    expect(isBibleTranslationCode(null)).toBe(false)
    expect(isBibleTranslationCode(123)).toBe(false)
    expect(isBibleTranslationCode({})).toBe(false)
  })
})

describe('getTranslationMeta', () => {
  it('returns the metadata record for a code', () => {
    const meta = getTranslationMeta('BSB')
    expect(meta.name).toBe('Berean Standard Bible')
  })
})
