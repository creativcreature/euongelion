import {
  formatPublished,
  DEVOTIONAL_PUBLISH_DATES,
} from '@/data/devotional-publish-dates'

/**
 * Author colophon — the credit that closes every reading.
 *
 * A publisher's colophon: who wrote it, who edited it, when it was first
 * published, and which translation the Scripture is drawn from. The house
 * copyright is not repeated here — SiteBottom carries it once, sitewide.
 *
 * House credit, founder ruling 2026-08-18: readings are written by **Milo**,
 * the pseudonym for the synthesis of AI tools used to produce them, and edited
 * by **James Parker**. The founder does not take the writing credit unless he
 * actually wrote the piece, deliberately, so that he can come to a reading and
 * discover it the way a reader does. Pass `writer`/`editor` to override for a
 * work that genuinely differs.
 *
 * The date comes from the slug rather than a prop so the day-vs-month
 * distinction cannot be lost at a call site: only 121 of 575 readings have a
 * true publication day, and the rest must not claim one. See
 * `devotional-publish-dates.ts`.
 *
 * Every field is optional; with nothing supplied it renders the ornament and
 * the wordmark line alone.
 */
export default function AuthorColophon({
  slug,
  writer = 'Milo',
  editor = 'James Parker',
  translation,
}: {
  slug?: string
  writer?: string
  editor?: string
  translation?: string
}) {
  const published = slug ? formatPublished(slug) : null
  const exact = slug
    ? DEVOTIONAL_PUBLISH_DATES[slug]?.source !== 'first-seen'
    : false

  return (
    <footer className="author-colophon" aria-label="Author credits">
      <p className="author-colophon-ornament" aria-hidden="true">
        ❦
      </p>
      <p className="author-colophon-line">
        <strong>Euangelion</strong> · A daily reading
      </p>
      {writer && (
        <p className="author-colophon-line">
          Written by <strong>{writer}</strong>
        </p>
      )}
      {editor && (
        <p className="author-colophon-line">
          Edited by <strong>{editor}</strong>
        </p>
      )}
      {translation && (
        <p className="author-colophon-line">
          Scripture: <strong>{translation}</strong>
        </p>
      )}
      {published && (
        <p className="author-colophon-line">
          {exact ? 'First published' : 'Added'} <strong>{published}</strong>
        </p>
      )}
    </footer>
  )
}
