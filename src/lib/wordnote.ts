// WordNote bank — inline word-study notes referenced by stable ID. Every entry's
// definition is lifted VERBATIM from the precomputed lexicon (Brown-Driver-Briggs
// / Strong's / Abbott-Smith) at build time by scripts/build-wordnote-bank.mjs.
// Nothing here is generated or invented: a WordNote either resolves to a real
// lexicon-grounded entry or it does not render at all (never a fabricated gloss).
//
// The bank is small (~40 entries) so it ships in the client bundle for synchronous,
// SSR-safe lookup — content references a note by `id` only.
import { WORDNOTE_BANK } from '@/data/wordnote-bank'

export interface WordNoteEntry {
  /** Stable kebab id used as the bank reference in content markers. */
  id: string
  /** English display word the note annotates (a label; the gloss is authoritative). */
  term: string
  /** Strong's number, e.g. "H7965" / "G3056". */
  strong: string
  /** Original-language script, e.g. "שָׁלוֹם" / "λόγος". */
  word: string
  /** Transliteration, e.g. "shâlôwm" / "lógos". */
  xlit: string
  /** Verbatim lexicon gloss. */
  gloss: string
  /** Attribution, e.g. "Brown-Driver-Briggs (Strong's H7965)". */
  source: string
}

const BY_ID: Map<string, WordNoteEntry> = new Map(
  WORDNOTE_BANK.map((e) => [e.id, e]),
)

/** Resolve a WordNote by bank id. Returns null when the id is not in the bank. */
export function getWordNote(id: string): WordNoteEntry | null {
  return BY_ID.get(id) ?? null
}

/** All notes in the bank (e.g. for an index / glossary surface). */
export function listWordNotes(): WordNoteEntry[] {
  return WORDNOTE_BANK
}

/** True when a bank id resolves to a real grounded entry. */
export function hasWordNote(id: string): boolean {
  return BY_ID.has(id)
}
