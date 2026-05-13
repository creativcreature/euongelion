import {
  BIBLE_BOOK_META,
  isSingleChapterBook,
  lookupBookId,
  type BibleBookId,
} from './books'

export interface ParsedReference {
  book: BibleBookId
  bookName: string
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
  canonical: string
}

const RANGE_DASH = /[‐-―−-]/

function normalizeWhitespaceAndDashes(value: string): string {
  return value
    .replace(new RegExp(RANGE_DASH.source, 'g'), '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildCanonical(parts: {
  bookName: string
  startChapter: number
  startVerse: number
  endChapter: number
  endVerse: number
  isSingleChapter: boolean
}): string {
  const {
    bookName,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
    isSingleChapter,
  } = parts

  if (isSingleChapter) {
    if (startVerse === endVerse) return `${bookName} ${startVerse}`
    return `${bookName} ${startVerse}-${endVerse}`
  }

  if (startVerse === 0 && endVerse === 0 && startChapter === endChapter) {
    return `${bookName} ${startChapter}`
  }

  if (startChapter === endChapter) {
    if (startVerse === endVerse)
      return `${bookName} ${startChapter}:${startVerse}`
    return `${bookName} ${startChapter}:${startVerse}-${endVerse}`
  }

  return `${bookName} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`
}

export function parseReference(reference: string): ParsedReference | null {
  if (!reference || typeof reference !== 'string') return null

  const normalized = normalizeWhitespaceAndDashes(reference)
  if (!normalized) return null

  const match = normalized.match(/^(.+?)\s+(\d.*)$/)
  if (!match) return null

  const rawBook = match[1].trim()
  const rest = match[2].trim()

  const bookId = lookupBookId(rawBook)
  if (!bookId) return null

  const meta = BIBLE_BOOK_META[bookId]
  const single = isSingleChapterBook(bookId)

  const numericPattern = /^(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/
  const numbers = rest.match(numericPattern)
  if (!numbers) return null

  const a = parseInt(numbers[1], 10)
  const b = numbers[2] ? parseInt(numbers[2], 10) : null
  const c = numbers[3] ? parseInt(numbers[3], 10) : null
  const d = numbers[4] ? parseInt(numbers[4], 10) : null

  let startChapter: number
  let startVerse: number
  let endChapter: number
  let endVerse: number

  if (single) {
    if (b !== null) return null
    startChapter = 1
    endChapter = 1
    startVerse = a
    endVerse = c !== null ? c : a
  } else if (b === null) {
    startChapter = a
    endChapter = c !== null ? c : a
    startVerse = 0
    endVerse = 0
  } else if (c === null) {
    startChapter = a
    endChapter = a
    startVerse = b
    endVerse = b
  } else if (d === null) {
    startChapter = a
    endChapter = a
    startVerse = b
    endVerse = c
  } else {
    startChapter = a
    startVerse = b
    endChapter = c
    endVerse = d
  }

  if (startChapter < 1 || endChapter < 1) return null
  if (startChapter > meta.chapters || endChapter > meta.chapters) return null
  if (startVerse < 0 || endVerse < 0) return null
  if (
    endChapter < startChapter ||
    (endChapter === startChapter && endVerse !== 0 && endVerse < startVerse)
  ) {
    return null
  }

  return {
    book: bookId,
    bookName: meta.name,
    startChapter,
    startVerse,
    endChapter,
    endVerse,
    canonical: buildCanonical({
      bookName: meta.name,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
      isSingleChapter: single,
    }),
  }
}
