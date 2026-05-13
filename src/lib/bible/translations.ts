export const BIBLE_TRANSLATION_CODES = [
  'BSB',
  'WEB',
  'KJV',
  'ASV',
  'YLT',
  'DARBY',
  'BBE',
] as const

export type BibleTranslationCode = (typeof BIBLE_TRANSLATION_CODES)[number]

export const DEFAULT_BIBLE_TRANSLATION: BibleTranslationCode = 'BSB'

export interface BibleTranslationMeta {
  code: BibleTranslationCode
  name: string
  short: string
  year: number
  license: string
  licenseShort: string
  source: string
  tone: string
  description: string
}

export const BIBLE_TRANSLATIONS: Record<
  BibleTranslationCode,
  BibleTranslationMeta
> = {
  BSB: {
    code: 'BSB',
    name: 'Berean Standard Bible',
    short: 'BSB',
    year: 2022,
    license: 'Public domain (CC0 1.0 Universal)',
    licenseShort: 'CC0',
    source: 'bereanbible.com',
    tone: 'Modern, clear, readable',
    description:
      'The Berean Standard Bible is a modern English translation released to the public domain via Creative Commons Zero. Default for clarity and readability.',
  },
  WEB: {
    code: 'WEB',
    name: 'World English Bible',
    short: 'WEB',
    year: 2000,
    license: 'Public domain',
    licenseShort: 'PD',
    source: 'ebible.org',
    tone: 'Modern, accessible',
    description:
      'A modern revision of the American Standard Version, released to the public domain by Michael Johnson and ebible.org.',
  },
  KJV: {
    code: 'KJV',
    name: 'King James Version',
    short: 'KJV',
    year: 1769,
    license: 'Public domain in the United States',
    licenseShort: 'PD (US)',
    source: 'ebible.org',
    tone: 'Literary, traditional',
    description:
      'The 1769 Cambridge standardized text of the King James Version. Public domain in the United States; Crown Copyright in the United Kingdom by way of Letters Patent.',
  },
  ASV: {
    code: 'ASV',
    name: 'American Standard Version',
    short: 'ASV',
    year: 1901,
    license: 'Public domain',
    licenseShort: 'PD',
    source: 'ebible.org',
    tone: 'Literal, formal',
    description:
      'Word-for-word literal translation from 1901. Useful alongside Hebrew and Greek vocabulary modules.',
  },
  YLT: {
    code: 'YLT',
    name: "Young's Literal Translation",
    short: 'YLT',
    year: 1898,
    license: 'Public domain',
    licenseShort: 'PD',
    source: 'ebible.org',
    tone: 'Hyper-literal',
    description:
      "Robert Young's 1898 hyper-literal translation. Surfaces verb tenses and grammatical structure of the original languages.",
  },
  DARBY: {
    code: 'DARBY',
    name: 'Darby Translation',
    short: 'DARBY',
    year: 1890,
    license: 'Public domain',
    licenseShort: 'PD',
    source: 'ebible.org',
    tone: 'Precise, technical',
    description:
      'John Nelson Darby’s 1890 translation. Known for precise translation choices, especially in the Pauline epistles.',
  },
  BBE: {
    code: 'BBE',
    name: 'Bible in Basic English',
    short: 'BBE',
    year: 1949,
    license: 'Public domain in the United States',
    licenseShort: 'PD (US)',
    source: 'ebible.org',
    tone: 'Simplest English',
    description:
      'Bible in Basic English (1949), produced under the direction of S. H. Hooke at the University of London. Lowest-literacy entry point.',
  },
}

export function isBibleTranslationCode(
  value: unknown,
): value is BibleTranslationCode {
  return (
    typeof value === 'string' &&
    (BIBLE_TRANSLATION_CODES as readonly string[]).includes(value)
  )
}

export function getTranslationMeta(
  code: BibleTranslationCode,
): BibleTranslationMeta {
  return BIBLE_TRANSLATIONS[code]
}
