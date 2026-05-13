export const BIBLE_BOOK_IDS = [
  'GEN',
  'EXO',
  'LEV',
  'NUM',
  'DEU',
  'JOS',
  'JDG',
  'RUT',
  '1SA',
  '2SA',
  '1KI',
  '2KI',
  '1CH',
  '2CH',
  'EZR',
  'NEH',
  'EST',
  'JOB',
  'PSA',
  'PRO',
  'ECC',
  'SNG',
  'ISA',
  'JER',
  'LAM',
  'EZK',
  'DAN',
  'HOS',
  'JOL',
  'AMO',
  'OBA',
  'JON',
  'MIC',
  'NAM',
  'HAB',
  'ZEP',
  'HAG',
  'ZEC',
  'MAL',
  'MAT',
  'MRK',
  'LUK',
  'JHN',
  'ACT',
  'ROM',
  '1CO',
  '2CO',
  'GAL',
  'EPH',
  'PHP',
  'COL',
  '1TH',
  '2TH',
  '1TI',
  '2TI',
  'TIT',
  'PHM',
  'HEB',
  'JAS',
  '1PE',
  '2PE',
  '1JN',
  '2JN',
  '3JN',
  'JUD',
  'REV',
] as const

export type BibleBookId = (typeof BIBLE_BOOK_IDS)[number]

export interface BibleBookMeta {
  id: BibleBookId
  name: string
  testament: 'OT' | 'NT'
  chapters: number
  singleChapter: boolean
}

export const BIBLE_BOOK_META: Record<BibleBookId, BibleBookMeta> = {
  GEN: {
    id: 'GEN',
    name: 'Genesis',
    testament: 'OT',
    chapters: 50,
    singleChapter: false,
  },
  EXO: {
    id: 'EXO',
    name: 'Exodus',
    testament: 'OT',
    chapters: 40,
    singleChapter: false,
  },
  LEV: {
    id: 'LEV',
    name: 'Leviticus',
    testament: 'OT',
    chapters: 27,
    singleChapter: false,
  },
  NUM: {
    id: 'NUM',
    name: 'Numbers',
    testament: 'OT',
    chapters: 36,
    singleChapter: false,
  },
  DEU: {
    id: 'DEU',
    name: 'Deuteronomy',
    testament: 'OT',
    chapters: 34,
    singleChapter: false,
  },
  JOS: {
    id: 'JOS',
    name: 'Joshua',
    testament: 'OT',
    chapters: 24,
    singleChapter: false,
  },
  JDG: {
    id: 'JDG',
    name: 'Judges',
    testament: 'OT',
    chapters: 21,
    singleChapter: false,
  },
  RUT: {
    id: 'RUT',
    name: 'Ruth',
    testament: 'OT',
    chapters: 4,
    singleChapter: false,
  },
  '1SA': {
    id: '1SA',
    name: '1 Samuel',
    testament: 'OT',
    chapters: 31,
    singleChapter: false,
  },
  '2SA': {
    id: '2SA',
    name: '2 Samuel',
    testament: 'OT',
    chapters: 24,
    singleChapter: false,
  },
  '1KI': {
    id: '1KI',
    name: '1 Kings',
    testament: 'OT',
    chapters: 22,
    singleChapter: false,
  },
  '2KI': {
    id: '2KI',
    name: '2 Kings',
    testament: 'OT',
    chapters: 25,
    singleChapter: false,
  },
  '1CH': {
    id: '1CH',
    name: '1 Chronicles',
    testament: 'OT',
    chapters: 29,
    singleChapter: false,
  },
  '2CH': {
    id: '2CH',
    name: '2 Chronicles',
    testament: 'OT',
    chapters: 36,
    singleChapter: false,
  },
  EZR: {
    id: 'EZR',
    name: 'Ezra',
    testament: 'OT',
    chapters: 10,
    singleChapter: false,
  },
  NEH: {
    id: 'NEH',
    name: 'Nehemiah',
    testament: 'OT',
    chapters: 13,
    singleChapter: false,
  },
  EST: {
    id: 'EST',
    name: 'Esther',
    testament: 'OT',
    chapters: 10,
    singleChapter: false,
  },
  JOB: {
    id: 'JOB',
    name: 'Job',
    testament: 'OT',
    chapters: 42,
    singleChapter: false,
  },
  PSA: {
    id: 'PSA',
    name: 'Psalms',
    testament: 'OT',
    chapters: 150,
    singleChapter: false,
  },
  PRO: {
    id: 'PRO',
    name: 'Proverbs',
    testament: 'OT',
    chapters: 31,
    singleChapter: false,
  },
  ECC: {
    id: 'ECC',
    name: 'Ecclesiastes',
    testament: 'OT',
    chapters: 12,
    singleChapter: false,
  },
  SNG: {
    id: 'SNG',
    name: 'Song of Solomon',
    testament: 'OT',
    chapters: 8,
    singleChapter: false,
  },
  ISA: {
    id: 'ISA',
    name: 'Isaiah',
    testament: 'OT',
    chapters: 66,
    singleChapter: false,
  },
  JER: {
    id: 'JER',
    name: 'Jeremiah',
    testament: 'OT',
    chapters: 52,
    singleChapter: false,
  },
  LAM: {
    id: 'LAM',
    name: 'Lamentations',
    testament: 'OT',
    chapters: 5,
    singleChapter: false,
  },
  EZK: {
    id: 'EZK',
    name: 'Ezekiel',
    testament: 'OT',
    chapters: 48,
    singleChapter: false,
  },
  DAN: {
    id: 'DAN',
    name: 'Daniel',
    testament: 'OT',
    chapters: 12,
    singleChapter: false,
  },
  HOS: {
    id: 'HOS',
    name: 'Hosea',
    testament: 'OT',
    chapters: 14,
    singleChapter: false,
  },
  JOL: {
    id: 'JOL',
    name: 'Joel',
    testament: 'OT',
    chapters: 3,
    singleChapter: false,
  },
  AMO: {
    id: 'AMO',
    name: 'Amos',
    testament: 'OT',
    chapters: 9,
    singleChapter: false,
  },
  OBA: {
    id: 'OBA',
    name: 'Obadiah',
    testament: 'OT',
    chapters: 1,
    singleChapter: true,
  },
  JON: {
    id: 'JON',
    name: 'Jonah',
    testament: 'OT',
    chapters: 4,
    singleChapter: false,
  },
  MIC: {
    id: 'MIC',
    name: 'Micah',
    testament: 'OT',
    chapters: 7,
    singleChapter: false,
  },
  NAM: {
    id: 'NAM',
    name: 'Nahum',
    testament: 'OT',
    chapters: 3,
    singleChapter: false,
  },
  HAB: {
    id: 'HAB',
    name: 'Habakkuk',
    testament: 'OT',
    chapters: 3,
    singleChapter: false,
  },
  ZEP: {
    id: 'ZEP',
    name: 'Zephaniah',
    testament: 'OT',
    chapters: 3,
    singleChapter: false,
  },
  HAG: {
    id: 'HAG',
    name: 'Haggai',
    testament: 'OT',
    chapters: 2,
    singleChapter: false,
  },
  ZEC: {
    id: 'ZEC',
    name: 'Zechariah',
    testament: 'OT',
    chapters: 14,
    singleChapter: false,
  },
  MAL: {
    id: 'MAL',
    name: 'Malachi',
    testament: 'OT',
    chapters: 4,
    singleChapter: false,
  },
  MAT: {
    id: 'MAT',
    name: 'Matthew',
    testament: 'NT',
    chapters: 28,
    singleChapter: false,
  },
  MRK: {
    id: 'MRK',
    name: 'Mark',
    testament: 'NT',
    chapters: 16,
    singleChapter: false,
  },
  LUK: {
    id: 'LUK',
    name: 'Luke',
    testament: 'NT',
    chapters: 24,
    singleChapter: false,
  },
  JHN: {
    id: 'JHN',
    name: 'John',
    testament: 'NT',
    chapters: 21,
    singleChapter: false,
  },
  ACT: {
    id: 'ACT',
    name: 'Acts',
    testament: 'NT',
    chapters: 28,
    singleChapter: false,
  },
  ROM: {
    id: 'ROM',
    name: 'Romans',
    testament: 'NT',
    chapters: 16,
    singleChapter: false,
  },
  '1CO': {
    id: '1CO',
    name: '1 Corinthians',
    testament: 'NT',
    chapters: 16,
    singleChapter: false,
  },
  '2CO': {
    id: '2CO',
    name: '2 Corinthians',
    testament: 'NT',
    chapters: 13,
    singleChapter: false,
  },
  GAL: {
    id: 'GAL',
    name: 'Galatians',
    testament: 'NT',
    chapters: 6,
    singleChapter: false,
  },
  EPH: {
    id: 'EPH',
    name: 'Ephesians',
    testament: 'NT',
    chapters: 6,
    singleChapter: false,
  },
  PHP: {
    id: 'PHP',
    name: 'Philippians',
    testament: 'NT',
    chapters: 4,
    singleChapter: false,
  },
  COL: {
    id: 'COL',
    name: 'Colossians',
    testament: 'NT',
    chapters: 4,
    singleChapter: false,
  },
  '1TH': {
    id: '1TH',
    name: '1 Thessalonians',
    testament: 'NT',
    chapters: 5,
    singleChapter: false,
  },
  '2TH': {
    id: '2TH',
    name: '2 Thessalonians',
    testament: 'NT',
    chapters: 3,
    singleChapter: false,
  },
  '1TI': {
    id: '1TI',
    name: '1 Timothy',
    testament: 'NT',
    chapters: 6,
    singleChapter: false,
  },
  '2TI': {
    id: '2TI',
    name: '2 Timothy',
    testament: 'NT',
    chapters: 4,
    singleChapter: false,
  },
  TIT: {
    id: 'TIT',
    name: 'Titus',
    testament: 'NT',
    chapters: 3,
    singleChapter: false,
  },
  PHM: {
    id: 'PHM',
    name: 'Philemon',
    testament: 'NT',
    chapters: 1,
    singleChapter: true,
  },
  HEB: {
    id: 'HEB',
    name: 'Hebrews',
    testament: 'NT',
    chapters: 13,
    singleChapter: false,
  },
  JAS: {
    id: 'JAS',
    name: 'James',
    testament: 'NT',
    chapters: 5,
    singleChapter: false,
  },
  '1PE': {
    id: '1PE',
    name: '1 Peter',
    testament: 'NT',
    chapters: 5,
    singleChapter: false,
  },
  '2PE': {
    id: '2PE',
    name: '2 Peter',
    testament: 'NT',
    chapters: 3,
    singleChapter: false,
  },
  '1JN': {
    id: '1JN',
    name: '1 John',
    testament: 'NT',
    chapters: 5,
    singleChapter: false,
  },
  '2JN': {
    id: '2JN',
    name: '2 John',
    testament: 'NT',
    chapters: 1,
    singleChapter: true,
  },
  '3JN': {
    id: '3JN',
    name: '3 John',
    testament: 'NT',
    chapters: 1,
    singleChapter: true,
  },
  JUD: {
    id: 'JUD',
    name: 'Jude',
    testament: 'NT',
    chapters: 1,
    singleChapter: true,
  },
  REV: {
    id: 'REV',
    name: 'Revelation',
    testament: 'NT',
    chapters: 22,
    singleChapter: false,
  },
}

const BOOK_ALIASES: Record<string, BibleBookId> = {}

function alias(name: string, id: BibleBookId) {
  BOOK_ALIASES[name.toLowerCase().replace(/\s+/g, ' ').trim()] = id
}

for (const meta of Object.values(BIBLE_BOOK_META)) {
  alias(meta.name, meta.id)
  alias(meta.id, meta.id)
}

alias('Gn', 'GEN')
alias('Gen', 'GEN')
alias('Ge', 'GEN')
alias('Ex', 'EXO')
alias('Exod', 'EXO')
alias('Lv', 'LEV')
alias('Lev', 'LEV')
alias('Nm', 'NUM')
alias('Num', 'NUM')
alias('Nu', 'NUM')
alias('Dt', 'DEU')
alias('Deut', 'DEU')
alias('Deu', 'DEU')
alias('Jos', 'JOS')
alias('Jsh', 'JOS')
alias('Josh', 'JOS')
alias('Jdg', 'JDG')
alias('Judg', 'JDG')
alias('Jg', 'JDG')
alias('Ru', 'RUT')
alias('Rth', 'RUT')
alias('Rut', 'RUT')
alias('1 Sam', '1SA')
alias('1Sam', '1SA')
alias('1S', '1SA')
alias('1Sa', '1SA')
alias('I Samuel', '1SA')
alias('First Samuel', '1SA')
alias('2 Sam', '2SA')
alias('2Sam', '2SA')
alias('2S', '2SA')
alias('2Sa', '2SA')
alias('II Samuel', '2SA')
alias('Second Samuel', '2SA')
alias('1 Kgs', '1KI')
alias('1Kgs', '1KI')
alias('1K', '1KI')
alias('1Ki', '1KI')
alias('I Kings', '1KI')
alias('First Kings', '1KI')
alias('2 Kgs', '2KI')
alias('2Kgs', '2KI')
alias('2K', '2KI')
alias('2Ki', '2KI')
alias('II Kings', '2KI')
alias('Second Kings', '2KI')
alias('1 Chr', '1CH')
alias('1Chr', '1CH')
alias('1Ch', '1CH')
alias('1Chron', '1CH')
alias('I Chronicles', '1CH')
alias('First Chronicles', '1CH')
alias('2 Chr', '2CH')
alias('2Chr', '2CH')
alias('2Ch', '2CH')
alias('2Chron', '2CH')
alias('II Chronicles', '2CH')
alias('Second Chronicles', '2CH')
alias('Ezr', 'EZR')
alias('Neh', 'NEH')
alias('Ne', 'NEH')
alias('Est', 'EST')
alias('Esth', 'EST')
alias('Jb', 'JOB')
alias('Ps', 'PSA')
alias('Psalm', 'PSA')
alias('Pss', 'PSA')
alias('Psa', 'PSA')
alias('Pr', 'PRO')
alias('Prv', 'PRO')
alias('Prov', 'PRO')
alias('Ec', 'ECC')
alias('Eccl', 'ECC')
alias('Qoh', 'ECC')
alias('Qoheleth', 'ECC')
alias('Sg', 'SNG')
alias('Song', 'SNG')
alias('Song of Songs', 'SNG')
alias('Song of Sol', 'SNG')
alias('Canticles', 'SNG')
alias('Cant', 'SNG')
alias('Is', 'ISA')
alias('Isa', 'ISA')
alias('Jer', 'JER')
alias('Jr', 'JER')
alias('Lam', 'LAM')
alias('La', 'LAM')
alias('Ezk', 'EZK')
alias('Ez', 'EZK')
alias('Ezek', 'EZK')
alias('Eze', 'EZK')
alias('Ezekiel', 'EZK')
alias('Dn', 'DAN')
alias('Dan', 'DAN')
alias('Hos', 'HOS')
alias('Ho', 'HOS')
alias('Joel', 'JOL')
alias('Jl', 'JOL')
alias('Joe', 'JOL')
alias('Am', 'AMO')
alias('Amo', 'AMO')
alias('Ob', 'OBA')
alias('Obad', 'OBA')
alias('Jnh', 'JON')
alias('Jon', 'JON')
alias('Mi', 'MIC')
alias('Mic', 'MIC')
alias('Na', 'NAM')
alias('Nah', 'NAM')
alias('Nahum', 'NAM')
alias('Hab', 'HAB')
alias('Hb', 'HAB')
alias('Zep', 'ZEP')
alias('Zeph', 'ZEP')
alias('Zp', 'ZEP')
alias('Hg', 'HAG')
alias('Hag', 'HAG')
alias('Zec', 'ZEC')
alias('Zech', 'ZEC')
alias('Zc', 'ZEC')
alias('Mal', 'MAL')
alias('Ml', 'MAL')
alias('Mt', 'MAT')
alias('Mat', 'MAT')
alias('Matt', 'MAT')
alias('Mk', 'MRK')
alias('Mar', 'MRK')
alias('Mrk', 'MRK')
alias('Lk', 'LUK')
alias('Luk', 'LUK')
alias('Jn', 'JHN')
alias('Jhn', 'JHN')
alias('Joh', 'JHN')
alias('Ac', 'ACT')
alias('Act', 'ACT')
alias('Ro', 'ROM')
alias('Rom', 'ROM')
alias('Rm', 'ROM')
alias('1 Cor', '1CO')
alias('1Cor', '1CO')
alias('1Co', '1CO')
alias('I Corinthians', '1CO')
alias('First Corinthians', '1CO')
alias('2 Cor', '2CO')
alias('2Cor', '2CO')
alias('2Co', '2CO')
alias('II Corinthians', '2CO')
alias('Second Corinthians', '2CO')
alias('Gal', 'GAL')
alias('Ga', 'GAL')
alias('Eph', 'EPH')
alias('Ephes', 'EPH')
alias('Phil', 'PHP')
alias('Php', 'PHP')
alias('Pp', 'PHP')
alias('Philip', 'PHP')
alias('Col', 'COL')
alias('1 Thess', '1TH')
alias('1Thess', '1TH')
alias('1Th', '1TH')
alias('1Thes', '1TH')
alias('I Thessalonians', '1TH')
alias('First Thessalonians', '1TH')
alias('2 Thess', '2TH')
alias('2Thess', '2TH')
alias('2Th', '2TH')
alias('2Thes', '2TH')
alias('II Thessalonians', '2TH')
alias('Second Thessalonians', '2TH')
alias('1 Tim', '1TI')
alias('1Tim', '1TI')
alias('1Ti', '1TI')
alias('I Timothy', '1TI')
alias('First Timothy', '1TI')
alias('2 Tim', '2TI')
alias('2Tim', '2TI')
alias('2Ti', '2TI')
alias('II Timothy', '2TI')
alias('Second Timothy', '2TI')
alias('Tit', 'TIT')
alias('Ti', 'TIT')
alias('Phm', 'PHM')
alias('Philem', 'PHM')
alias('Phlm', 'PHM')
alias('Heb', 'HEB')
alias('He', 'HEB')
alias('Jas', 'JAS')
alias('Jm', 'JAS')
alias('Jam', 'JAS')
alias('1 Pet', '1PE')
alias('1Pet', '1PE')
alias('1Pe', '1PE')
alias('1P', '1PE')
alias('I Peter', '1PE')
alias('First Peter', '1PE')
alias('2 Pet', '2PE')
alias('2Pet', '2PE')
alias('2Pe', '2PE')
alias('2P', '2PE')
alias('II Peter', '2PE')
alias('Second Peter', '2PE')
alias('1 Jn', '1JN')
alias('1Jn', '1JN')
alias('1Jo', '1JN')
alias('1J', '1JN')
alias('1 John', '1JN')
alias('I John', '1JN')
alias('First John', '1JN')
alias('2 Jn', '2JN')
alias('2Jn', '2JN')
alias('2Jo', '2JN')
alias('2J', '2JN')
alias('2 John', '2JN')
alias('II John', '2JN')
alias('Second John', '2JN')
alias('3 Jn', '3JN')
alias('3Jn', '3JN')
alias('3Jo', '3JN')
alias('3J', '3JN')
alias('3 John', '3JN')
alias('III John', '3JN')
alias('Third John', '3JN')
alias('Jud', 'JUD')
alias('Jude', 'JUD')
alias('Rv', 'REV')
alias('Rev', 'REV')
alias('Re', 'REV')
alias('Apoc', 'REV')
alias('Revelation of John', 'REV')
alias('Revelation of Jesus Christ', 'REV')
alias('The Revelation', 'REV')
alias('Song of Songs', 'SNG')
alias('Psalm', 'PSA')

export function lookupBookId(name: string): BibleBookId | null {
  if (!name) return null
  const normalized = name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized in BOOK_ALIASES) return BOOK_ALIASES[normalized]
  const noSpaces = normalized.replace(/\s+/g, '')
  for (const [key, id] of Object.entries(BOOK_ALIASES)) {
    if (key.replace(/\s+/g, '') === noSpaces) return id
  }
  return null
}

export function isSingleChapterBook(id: BibleBookId): boolean {
  return BIBLE_BOOK_META[id].singleChapter
}
