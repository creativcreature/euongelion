import type { DevotionalProgress } from '@/types'

/**
 * The one rule for reconciling reading completions between a device and an
 * account: COMPLETION IS MONOTONE. Finished anywhere is finished everywhere.
 *
 * That is what makes this a union and not a "latest wins" sync. Position
 * inside an audio track is the opposite case — there the newest write must win
 * (see `lib/audio/listening-progress.ts`), because a reader who restarts a
 * track on their phone means it. Finishing has no counterpart: nobody
 * un-finishes a devotional, so a side that knows about a completion is always
 * right and a side that does not is merely behind.
 *
 * On a slug both sides know, the EARLIER `completedAt` wins — that is when the
 * reader actually finished it, and a device syncing a week late must not
 * rewrite the date. `timeSpent` comes from whichever side recorded one, which
 * is the same rule: the first reading is the one that was timed.
 */
export function unionCompletions(
  ...sides: ReadonlyArray<readonly DevotionalProgress[]>
): DevotionalProgress[] {
  const bySlug = new Map<string, DevotionalProgress>()

  for (const side of sides) {
    for (const entry of side) {
      if (!entry || typeof entry.slug !== 'string' || !entry.slug) continue
      const existing = bySlug.get(entry.slug)
      if (!existing) {
        bySlug.set(entry.slug, { ...entry })
        continue
      }
      bySlug.set(entry.slug, {
        slug: entry.slug,
        completedAt:
          existing.completedAt <= entry.completedAt
            ? existing.completedAt
            : entry.completedAt,
        timeSpent: existing.timeSpent ?? entry.timeSpent,
      })
    }
  }

  return Array.from(bySlug.values()).sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  )
}

/** Slugs present in `have` that `known` has never seen. */
export function completionsMissingFrom(
  have: readonly DevotionalProgress[],
  known: readonly DevotionalProgress[],
): DevotionalProgress[] {
  const knownSlugs = new Set(known.map((entry) => entry.slug))
  return have.filter((entry) => !knownSlugs.has(entry.slug))
}
