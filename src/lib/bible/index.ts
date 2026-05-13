// Client-safe barrel. Only exports metadata, types, and pure parsing.
// `getVerse` reads from the filesystem and must be imported directly from
// '@/lib/bible/getVerse' in server-only code (route handlers, RSCs, scripts).

export {
  BIBLE_TRANSLATION_CODES,
  BIBLE_TRANSLATIONS,
  DEFAULT_BIBLE_TRANSLATION,
  getTranslationMeta,
  isBibleTranslationCode,
  type BibleTranslationCode,
  type BibleTranslationMeta,
} from './translations'

export {
  BIBLE_BOOK_IDS,
  BIBLE_BOOK_META,
  isSingleChapterBook,
  lookupBookId,
  type BibleBookId,
  type BibleBookMeta,
} from './books'

export { parseReference, type ParsedReference } from './parseReference'
