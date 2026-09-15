/**
 * Holy rabbit holes, followed (plan §74). A rabbit hole names a passage; its
 * thread is somewhere this site has already gone with that passage: a past
 * Daily Bread edition on the same book and chapter (the archive is the paper's
 * own memory, so it comes first), else a devotional built on it. One link per
 * rabbit hole, chosen deterministically, never a feed.
 */
import { parseReference } from '@/lib/bible/parseReference'
import type { RabbitHole } from '../types'

export interface ThreadSources {
  /** Published or ready editions before this one, newest first. */
  pastEditions: { editionDate: string; title: string; reference: string }[]
  devotionals: { slug: string; title: string; reference: string }[]
}

/** "John 15" for "John 15:4-5"; null when the reference cannot be read. */
export function chapterKey(reference: string): string | null {
  const parsed = parseReference(reference)
  return parsed ? `${parsed.book}:${parsed.startChapter}` : null
}

export function threadFor(
  hole: Pick<RabbitHole, 'reference'>,
  sources: ThreadSources,
  taken: ReadonlySet<string> = new Set(),
): RabbitHole['thread'] {
  const key = chapterKey(hole.reference)
  if (!key) return undefined
  const candidates = [
    ...sources.pastEditions
      .filter((e) => chapterKey(e.reference) === key)
      .map((e) => ({ href: `/daily-bread/${e.editionDate}`, label: e.title })),
    ...sources.devotionals
      .filter((d) => chapterKey(d.reference) === key)
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((d) => ({ href: `/devotional/${d.slug}`, label: d.title })),
  ]
  return candidates.find((c) => !taken.has(c.href))
}

/** One thread per rabbit hole, and never the same thread twice in one edition. */
export function withThreads(holes: RabbitHole[], sources: ThreadSources): RabbitHole[] {
  const taken = new Set<string>()
  return holes.map((hole) => {
    const thread = threadFor(hole, sources, taken)
    if (!thread) return hole
    taken.add(thread.href)
    return { ...hole, thread }
  })
}
