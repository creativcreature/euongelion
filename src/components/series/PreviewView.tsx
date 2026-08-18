import Link from 'next/link'
import Image from 'next/image'
import { SERIES_DATA } from '@/data/series'
import { dayCountLabel } from '@/lib/series/catalog'
import type { LayoutProps, SeriesProgress } from './SeriesLayouts'

/**
 * PREVIEW — the plate and what it is about (F-113).
 *
 * Founder 2026-08-16: "Change it to a two column version with the left column
 * th image and the right column a small 2-3 sentence summary of the
 * devotional. Instead of Flow this is Preview. Cover is now the default then
 * preview is the next toggle."
 *
 * This replaces Flow, which went through four rebuilds and never landed. The
 * brief here is much plainer and much better: a reader wants to see the art and
 * find out what the reading is about, and everything the artboard was doing —
 * panning, drifting columns, size levels — was standing between them and that.
 *
 * THE SUMMARY IS REAL COPY, NOT A GENERATED ONE. Every series already carries a
 * hand-written `introduction`, and that is what this slot prints. Most are
 * already two or three sentences; three run longer (up to six), so the summary
 * takes the FIRST THREE — the author's own words, in the author's own order,
 * simply stopped early. Nothing is paraphrased and nothing is invented.
 *
 * Server-rendered on purpose: there is no state here, so there is no reason for
 * this to be a client island.
 */
/**
 * The first `max` sentences of a passage.
 *
 * Splits on sentence-ending punctuation followed by a space, which is safe for
 * this copy: it holds no abbreviations or decimals that would split wrongly.
 * Returns the whole thing when it is already short enough, so a two-sentence
 * introduction is untouched.
 */
function firstSentences(text: string, max = 3) {
  const parts = text.split(/(?<=[.?!])\s+/).filter(Boolean)
  if (parts.length <= max) return text
  return parts.slice(0, max).join(' ')
}

function statusLabel(slug: string, progress?: SeriesProgress) {
  if (
    progress &&
    progress.completed > 0 &&
    progress.completed < progress.total
  ) {
    return `Day ${progress.completed + 1} of ${progress.total}`
  }
  if (progress && progress.completed >= progress.total) return 'Finished'
  return dayCountLabel(slug)
}

export default function PreviewView({
  slugs,
  progressBySeries,
  cardHref,
}: LayoutProps) {
  return (
    <div className="preview">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        return (
          <Link key={slug} href={cardHref(slug)} className="preview-row">
            <span className="preview-plate">
              {series.heroImage && (
                <Image
                  src={series.heroImage}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 100vw, 40vw"
                  className="preview-img"
                />
              )}
            </span>

            <span className="preview-copy">
              <span className="preview-kicker">
                {statusLabel(slug, progressBySeries.get(slug))}
              </span>
              <h3 className="preview-title">{series.title}</h3>
              <span className="preview-summary">
                {firstSentences(series.introduction)}
              </span>
              <span className="preview-more">Read this series &rarr;</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
