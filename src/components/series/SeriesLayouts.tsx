'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SERIES_DATA } from '@/data/series'
import { sectionsFor } from '@/data/series-sections'
import { dayCountLabel, seriesRecencyRank } from '@/lib/series/catalog'

/**
 * Ten ways to display the catalog (F-094).
 *
 * Founder: "I would like to see several layout options live on site for the
 * series page. lets say 10 distinct and unique ways of displaying the info that
 * is super sortable and searchable… BEAUTIFULLY DESIGNED WITH ATTENTION TO
 * DETAILS LIKE A WORLD CLASS UX UI DESIGNER."
 *
 * THE ORGANISING IDEA. Ten arbitrary CSS grids would be ten arbitrary CSS
 * grids. The founder's own words for this page are "a library of magazines" and
 * "each devotional is a newspaper on the rack" — so every view here is a real
 * way PRINT gets displayed, and takes its proportions and furniture from that
 * form rather than from a component library:
 *
 *   FEATURE     Monocle's front-of-book — one lead plate, varied tiles around it
 *   RACK        a kiosk rail — folded papers overlapping, mastheads showing
 *   COVERS      a Phaidon monograph plate wall — uniform, roomy, quiet
 *   SPINES      a shelf — titles running up the spine, pulled out on hover
 *   LIST        a stock list / departure board — dense, scannable, no art
 *   MOSAIC      Richter's Atlas wall — varied heights, no grid rhythm
 *   ISSUES      an issue chronology — numbered by release, newest first
 *
 * Founder-cut 2026-08-15: INDEX, CONTACT and BROADSHEET are removed. Ten was
 * the brief; seven is what survived review, and a switcher is worth more when
 * every option on it earns its place.
 *
 * Where a view carries a number, the number means something true: ISSUES
 * numbers by release order and spine WIDTH encodes length. Nothing is numbered
 * decoratively.
 */

export type ViewId =
  | 'feature'
  | 'rack'
  | 'covers'
  | 'spines'
  | 'list'
  | 'mosaic'
  | 'issues'

export const VIEWS: ReadonlyArray<{
  id: ViewId
  label: string
  /** Shown under the switcher — tells the reader what they are looking at. */
  blurb: string
}> = [
  // Founder-ordered 2026-08-15: Covers leads, Issues second. The art is the
  // fastest way to recognise a reading you have seen; recency is the second.
  { id: 'covers', label: 'Covers', blurb: 'Plates only. The art, at size, in order.' },
  { id: 'issues', label: 'Issues', blurb: 'By release. Newest issue first.' },
  { id: 'feature', label: 'Feature', blurb: 'Column inches by weight. The longest reading leads.' },
  { id: 'rack', label: 'Rack', blurb: 'Every series folded over the rail, mastheads out.' },
  { id: 'spines', label: 'Spines', blurb: 'Shelved. Read the spine, pull one out.' },
  { id: 'list', label: 'List', blurb: 'The whole catalog in one screen.' },
  { id: 'mosaic', label: 'Rose', blurb: 'One window. A hub, then rings working outward.' },
]

export interface SeriesProgress {
  completed: number
  total: number
}

export interface LayoutProps {
  slugs: string[]
  progressBySeries: Map<string, SeriesProgress>
  cardHref: (slug: string) => string
  /** The newest eligible series — the FEATURE view's lead. */
  lead: string
}

/* ── shared bits ────────────────────────────────────────────────────── */

function Plate({
  slug,
  sizes,
  priority,
  eager,
}: {
  slug: string
  sizes: string
  priority?: boolean
  /**
   * Load immediately rather than lazily, WITHOUT the preload hint `priority`
   * adds. The rose window needs this: its panes are transformed off their grid
   * position (`translate(-50%, -50%)`), and Chrome's lazy loader never fires
   * for them — every pane sat with an empty `currentSrc` and an unlit plate,
   * even sitting in the middle of the viewport. Thirty-six `priority` images
   * would be thirty-six preload hints competing with the page; `eager` just
   * turns the laziness off.
   */
  eager?: boolean
}) {
  const src = SERIES_DATA[slug]?.heroImage
  if (!src) return null
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      loading={eager && !priority ? 'eager' : undefined}
      className="series-plate-img"
    />
  )
}

function ProgressRail({ progress }: { progress?: SeriesProgress }) {
  if (!progress || progress.completed === 0) return null
  const pct = Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
  return (
    <span className="series-progress" aria-label={`${pct}% read`}>
      <span className="series-progress-fill" style={{ width: `${pct}%` }} />
    </span>
  )
}

/** "Day 3 of 7" when started, otherwise the length. One place, one wording. */
function statusLabel(slug: string, progress?: SeriesProgress) {
  if (progress && progress.completed > 0 && progress.completed < progress.total) {
    return `Day ${progress.completed + 1} of ${progress.total}`
  }
  if (progress && progress.completed >= progress.total) return 'Finished'
  return dayCountLabel(slug)
}

/* ── 1. FEATURE — the front page ────────────────────────────────────── */

/**
 * Founder 2026-08-16: "Feature style- Try something different here- make it
 * feel like a literal newspaper grid, with different sized stories etc."
 *
 * So this is a front page, not a bento. It follows the way a broadsheet
 * actually allocates space, and every size here means something about the
 * series rather than being decoration:
 *
 *   LEAD      the longest reading — plate, banner headline, standfirst
 *   SECOND    the next two, boxed and ruled, above the fold
 *   COLUMN    a right-hand rail of briefs, headline + length only
 *   BELOW     the rest, set in four ruled columns like classified listings
 *
 * Column rules and hairline boxes do the work a card shadow would do in a
 * generic grid — this is the furniture of print, which is the whole brief.
 */
export function FeatureView({ slugs, progressBySeries, cardHref, lead }: LayoutProps) {
  // Founder 2026-08-16: "Feature needs restyling, feels very unbalanced. I like
  // asymettry, but the hiearchy doesnt make sense in terms of size of
  // devotionals."
  //
  // That is the right complaint, and the fix is not to even the sizes out — it
  // is to make them MEAN something. A front page gives a story column inches in
  // proportion to its weight. Here weight is the length of the reading: a
  // 365-day companion set as a one-line brief while a five-day sits across the
  // top is exactly the nonsense being described.
  //
  // So the page is allocated by days, longest first, with recency breaking
  // ties. The asymmetry stays; it just now tells the truth about scale.
  const byWeight = useMemo(() => {
    return [...slugs].sort((a, b) => {
      const da = SERIES_DATA[a]?.days.length ?? 0
      const db = SERIES_DATA[b]?.days.length ?? 0
      if (db !== da) return db - da
      return seriesRecencyRank(a) - seriesRecencyRank(b)
    })
  }, [slugs])

  const headline = byWeight[0] ?? lead
  const leadSeries = SERIES_DATA[headline]
  const rest = useMemo(
    () => byWeight.filter((s) => s !== headline),
    [byWeight, headline],
  )
  const second = rest.slice(0, 2)
  const rail = rest.slice(2, 7)
  const below = rest.slice(7)

  return (
    <div className="frontpage">
      <div className="fp-above">
        <div className="fp-main">
          {leadSeries && (
            <Link href={cardHref(headline)} className="fp-lead">
              <span className="fp-lead-plate">
                <Plate slug={headline} sizes="(max-width: 900px) 100vw, 58vw" priority />
              </span>
              <span className="fp-lead-head">{leadSeries.title}</span>
              <span className="fp-lead-stand">{leadSeries.question}</span>
              <span className="fp-byline">
                The long read · {dayCountLabel(headline)}
              </span>
            </Link>
          )}

          <div className="fp-second">
            {second.map((slug) => {
              const series = SERIES_DATA[slug]
              if (!series) return null
              return (
                <Link key={slug} href={cardHref(slug)} className="fp-story">
                  <span className="fp-story-plate">
                    <Plate slug={slug} sizes="(max-width: 900px) 50vw, 29vw" />
                  </span>
                  <span className="fp-story-head">{series.title}</span>
                  <span className="fp-story-stand">{series.question}</span>
                  <span className="fp-byline">
                    {statusLabel(slug, progressBySeries.get(slug))}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        <aside className="fp-rail" aria-label="Also inside">
          <p className="fp-rail-head">Also inside</p>
          {rail.map((slug) => {
            const series = SERIES_DATA[slug]
            if (!series) return null
            return (
              <Link key={slug} href={cardHref(slug)} className="fp-brief">
                <span className="fp-brief-head">{series.title}</span>
                <span className="fp-byline">
                  {statusLabel(slug, progressBySeries.get(slug))}
                </span>
              </Link>
            )
          })}
        </aside>
      </div>

      {/* Below the fold, the page becomes a news SITE rather than a front
          page: named subject desks, each with its own rule, and every entry
          carrying a plate. Founder 2026-08-16: "the top feels like a
          newspaper, the bottom needs more finnese… like newspaper website with
          'sections' and such", and "bring images into the feature toggle state
          for all devotionals". The first entry of each desk runs wide with a
          landscape plate — the section lede — and the rest set as a row of
          equal thumbnails beneath it. */}
      {below.length > 0 &&
        sectionsFor(below).map((section) => {
          const [sectionLede, ...others] = section.slugs
          const ledeSeries = SERIES_DATA[sectionLede]
          return (
            <section className="fp-desk" key={section.name}>
              <div className="fp-desk-head">
                <h3 className="fp-desk-name">{section.name}</h3>
                <span className="fp-desk-rule" aria-hidden="true" />
                <span className="fp-desk-count">{section.slugs.length}</span>
              </div>
              <p className="fp-desk-blurb">{section.blurb}</p>

              <div className="fp-desk-body">
              {ledeSeries && (
                <Link href={cardHref(sectionLede)} className="fp-desk-lede">
                  <span className="fp-desk-lede-plate">
                    <Plate
                      slug={sectionLede}
                      sizes="(max-width: 900px) 100vw, 34vw"
                    />
                  </span>
                  <span className="fp-desk-lede-text">
                    <span className="fp-desk-lede-head">{ledeSeries.title}</span>
                    <span className="fp-desk-lede-stand">{ledeSeries.question}</span>
                    <span className="fp-byline">
                      {statusLabel(sectionLede, progressBySeries.get(sectionLede))}
                    </span>
                  </span>
                </Link>
              )}

              {others.length > 0 && (
                <div className="fp-desk-row">
                  {others.map((slug) => {
                    const series = SERIES_DATA[slug]
                    if (!series) return null
                    return (
                      <Link key={slug} href={cardHref(slug)} className="fp-desk-item">
                        <span className="fp-desk-item-plate">
                          <Plate
                            slug={slug}
                            sizes="(max-width: 640px) 44vw, (max-width: 1100px) 24vw, 16vw"
                          />
                        </span>
                        <span className="fp-desk-item-head">{series.title}</span>
                        <span className="fp-byline">
                          {statusLabel(slug, progressBySeries.get(slug))}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
              </div>
            </section>
          )
        })}
    </div>
  )
}

/* ── 2. RACK ────────────────────────────────────────────────────────── */

/**
 * The founder's own image: "each devotional is a newspaper on the rack."
 *
 * Founder 2026-08-16: "Rack doesnt feel like a news paper rack enough and I
 * think there are too many columns."
 *
 * Four to a rail rather than six, so each paper is wide enough to read as a
 * folded front page rather than a card: masthead across the top, a rule, the
 * plate, then the standfirst — the order a real front page uses. Each is
 * tilted by a fixed amount from its position (never random, so the rack looks
 * identical on every render) and hovering lifts one clear, as if pulled out.
 */
const RACK_PER_RAIL = 4

export function RackView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  const rails = useMemo(() => {
    const out: string[][] = []
    for (let i = 0; i < slugs.length; i += RACK_PER_RAIL) {
      out.push(slugs.slice(i, i + RACK_PER_RAIL))
    }
    return out
  }, [slugs])

  return (
    <div className="rack">
      {rails.map((rail, ri) => (
        <div className="rack-rail" key={ri}>
          <span className="rack-bar" aria-hidden="true" />
          <div className="rack-papers">
            {rail.map((slug, i) => {
              const series = SERIES_DATA[slug]
              if (!series) return null
              // Fixed lean, alternating, so the row reads as hand-placed
              // rather than as a grid — but is stable across renders.
              const lean = [-1.6, 0.9, -0.5, 1.4, -1.1, 0.4][i % 6]
              return (
                <Link
                  key={slug}
                  href={cardHref(slug)}
                  className="rack-paper"
                  style={{ transform: `rotate(${lean}deg)` }}
                >
                  <span className="rack-fold" aria-hidden="true" />
                  <span className="rack-masthead">{series.title}</span>
                  <span className="rack-rule" aria-hidden="true" />
                  <span className="rack-plate">
                    <Plate slug={slug} sizes="(max-width: 900px) 40vw, 16vw" />
                  </span>
                  <span className="rack-standfirst">{series.question}</span>
                  <span className="rack-dateline">
                    {statusLabel(slug, progressBySeries.get(slug))}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── 3. COVERS ──────────────────────────────────────────────────────── */

/** Founder: "The Library look should have less columns." Four, not eight. */
export function CoversView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <div className="covers">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <Link key={slug} href={cardHref(slug)} className="cover">
            <span className="cover-plate">
              <Plate slug={slug} sizes="(max-width: 640px) 46vw, (max-width: 1100px) 30vw, 23vw" />
            </span>
            <span className="cover-caption">
              <span className="cover-title">{series.title}</span>
              <span className="cover-meta">{statusLabel(slug, progress)}</span>
            </span>
            <ProgressRail progress={progress} />
          </Link>
        )
      })}
    </div>
  )
}


/**
 * Shelf bookends (F-098).
 *
 * Founder 2026-08-16: "add unique book ends on each row that are site
 * thematic." So each shelf gets its own pair, drawn from the furniture this
 * site already uses rather than from generic ornament — a lamp, a wheat sheaf,
 * a fish, an anchor, a chi-rho, a door. Line art only, one weight, no fill:
 * they sit at the ends of a row of spines and must not out-shout them.
 *
 * The pair on a shelf MIRRORS — the left one flipped — the way a real matched
 * pair does. Index is the shelf number, so the same shelf always gets the same
 * bookend and the wall never reshuffles between renders.
 */
const BOOKENDS: Array<{ label: string; path: React.ReactNode }> = [
  {
    // Lamp — "a lamp to my feet"
    label: 'lamp',
    path: (
      <>
        <path d="M13 30h14l-3 8H16z" />
        <path d="M20 30V20" />
        <path d="M20 20c-4 0-7-2.6-7-6s3-6 7-6 7 2.6 7 6-3 6-7 6z" />
        <path d="M20 8V3" />
      </>
    ),
  },
  {
    // Wheat — harvest
    label: 'wheat',
    path: (
      <>
        <path d="M20 38V12" />
        <path d="M20 16c-4-1-6-4-6-7 3 0 6 2 6 5" />
        <path d="M20 16c4-1 6-4 6-7-3 0-6 2-6 5" />
        <path d="M20 24c-4-1-6-4-6-7 3 0 6 2 6 5" />
        <path d="M20 24c4-1 6-4 6-7-3 0-6 2-6 5" />
        <path d="M20 12c-2-3-2-6 0-9 2 3 2 6 0 9z" />
      </>
    ),
  },
  {
    // Ichthys — the fish
    label: 'fish',
    path: (
      <>
        <path d="M6 22c6-9 18-9 24 0-6 9-18 9-24 0z" />
        <path d="M30 22l5-5v10z" />
      </>
    ),
  },
  {
    // Anchor — hope as an anchor for the soul
    label: 'anchor',
    path: (
      <>
        <path d="M20 12v26" />
        <path d="M14 16h12" />
        <circle cx="20" cy="8" r="4" />
        <path d="M8 26c0 7 5 12 12 12s12-5 12-12" />
      </>
    ),
  },
  {
    // Chi-Rho
    label: 'chi-rho',
    path: (
      <>
        <path d="M20 38V8" />
        <path d="M20 8h5a6 6 0 010 12h-5" />
        <path d="M9 34L31 14" />
        <path d="M31 34L9 14" />
      </>
    ),
  },
  {
    // Door — "I am the door"
    label: 'door',
    path: (
      <>
        <path d="M11 38V16a9 9 0 0118 0v22z" />
        <path d="M20 7V3" />
        <circle cx="24" cy="27" r="1.4" />
      </>
    ),
  },
]

function Bookend({ index, side }: { index: number; side: 'left' | 'right' }) {
  const mark = BOOKENDS[index % BOOKENDS.length]
  return (
    <span className={`shelf-bookend shelf-bookend--${side}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" className="shelf-bookend-mark" focusable="false">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mark.path}
        </g>
      </svg>
    </span>
  )
}

/* ── 4. SPINES ──────────────────────────────────────────────────────── */

/**
 * A shelf. Titles run bottom-to-top the way they do on a spine, spine width is
 * proportional to the length of the reading, and hovering lifts one out.
 * Width-as-length is the one piece of information a real shelf gives you at a
 * glance, so it is the one encoded here.
 */
// Founder 2026-08-16: "7 books per row on the spines, larger font for the
// titles." Seven leaves each spine wide enough to set the title at a size you
// can read across a room, which is what a spine is for.
const SPINES_PER_SHELF = 7

export function SpinesView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  // Founder 2026-08-16: "Spine should have several rows of books and the spines
  // can be larger. No overflow scroll, all on page visible." So the shelf wraps
  // into rows of twelve, each with its own board, and nothing scrolls sideways.
  // Then: "Center the books on spine- add unique book ends on each row that are
  // site thematic." Rows centre between a matched pair of bookends, so a short
  // final shelf reads as a deliberately part-filled shelf rather than a row
  // that ran out.
  const shelves = useMemo(() => {
    const out: string[][] = []
    for (let i = 0; i < slugs.length; i += SPINES_PER_SHELF) {
      out.push(slugs.slice(i, i + SPINES_PER_SHELF))
    }
    return out
  }, [slugs])

  return (
    <div className="shelf">
      {shelves.map((shelf, si) => (
        <div className="shelf-unit" key={si}>
          <div className="shelf-row">
            <Bookend index={si} side="left" />
        {shelf.map((slug, i) => {
          const series = SERIES_DATA[slug]
          if (!series) return null
          const days = series.days.length
          // Width still encodes length, and is now sized so a shelf of twelve
          // FILLS the row rather than trailing off into whitespace. Clamped so
          // bible-365 is a broad volume, not a wall.
          // Capped at 200 so seven of the longest readings still fit one line.
          const width = Math.min(200, Math.max(132, 124 + days * 6))
          return (
            <Link
              key={slug}
              href={cardHref(slug)}
              className={`spine spine--${i % 3}`}
              style={{ width: `${width}px` }}
              title={`${series.title} · ${dayCountLabel(slug)}`}
            >
              <span className="spine-title">{series.title}</span>
              <span className="spine-foot" aria-hidden="true">
                {days}
              </span>
              <ProgressRail progress={progressBySeries.get(slug)} />
            </Link>
          )
        })}
            <Bookend index={si} side="right" />
          </div>
          <span className="shelf-board" aria-hidden="true" />
        </div>
      ))}
    </div>
  )
}

/* ── 5. LIST ────────────────────────────────────────────────────────── */

/** Founder: "I want the list view to not show the category (shepheard, etc)." */
export function ListView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  return (
    <ul className="stocklist">
      {slugs.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const progress = progressBySeries.get(slug)
        return (
          <li key={slug}>
            <Link href={cardHref(slug)} className="stock-row">
              <span className="stock-title">{series.title}</span>
              <span className="stock-question">{series.question}</span>
              <span className="stock-meta">{statusLabel(slug, progress)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ── 6. THE ROSE WINDOW ─────────────────────────────────────────────

   Founder 2026-08-16: "Mosaic needs a completely different treatment, not a
   fan of it. Make whatever this one is extemely unique and creative. think
   outside the box. Completely new idea/layout for that one."

   Every other view in this set is a rectangle: a grid, a rail, a shelf, a
   list. So this one leaves the rectangle entirely.

   A rose window is the one piece of furniture a church puts its whole story
   into, and it is built exactly the way a catalog is: a centre, then rings
   working outward, each pane its own scene, all of it only legible when the
   light is behind it. The counts even fall out right — a hub, a ring of
   twelve, a ring of twenty-four, which is the arithmetic of Revelation 4
   before it is the arithmetic of thirty-seven series.

   Reading a real rose window means standing back and then stepping close.
   That is the interaction: the hub carries the name of whichever pane you are
   on, so titles are always readable at full size in one fixed place instead of
   being shrunk into thirty-seven tiny captions. Nothing rotates on hover and
   nothing spins on load — a window is still, and this is a reading surface,
   not a toy.

   Ring sizes are computed, never hardcoded to 37: rings fill 12, then 24, then
   36, and the last ring takes whatever is left. Add a series tomorrow and the
   window still closes. */

const ROSE_RINGS = [12, 24, 36]

interface Ring {
  radius: number
  size: number
  slugs: string[]
}

function buildRings(slugs: string[]): Ring[] {
  const rings: Ring[] = []
  let cursor = 0
  let index = 0
  while (cursor < slugs.length) {
    const capacity = ROSE_RINGS[index] ?? ROSE_RINGS[ROSE_RINGS.length - 1]
    const take = slugs.slice(cursor, cursor + capacity)
    rings.push({
      // Percentages of the window's half-width, so the whole thing scales with
      // its container and needs no measurement.
      radius: 27 + index * 16,
      size: index === 0 ? 15 : index === 1 ? 11.5 : 9.5,
      slugs: take,
    })
    cursor += take.length
    index += 1
  }
  return rings
}

export function RoseView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  const hub = slugs[0]
  const petals = useMemo(() => slugs.slice(1), [slugs])
  const rings = useMemo(() => buildRings(petals), [petals])
  const [focused, setFocused] = useState<string | null>(null)

  const named = focused ?? hub
  const namedSeries = SERIES_DATA[named]

  return (
    <div className="rose">
      <div className="rose-window">
        {/* Tracery — the stone the glass is set into. Drawn, not decorative:
            it is what makes the rings read as one window rather than as
            circles floating on a page. */}
        <span className="rose-tracery" aria-hidden="true">
          {rings.map((ring, i) => (
            <span
              key={i}
              className="rose-ring-line"
              style={{
                inset: `${50 - ring.radius}%`,
              }}
            />
          ))}
        </span>

        {rings.map((ring, ri) =>
          ring.slugs.map((slug, i) => {
            const series = SERIES_DATA[slug]
            if (!series) return null
            const angle = (360 / ring.slugs.length) * i - 90
            const rad = (angle * Math.PI) / 180
            const x = 50 + Math.cos(rad) * ring.radius
            const y = 50 + Math.sin(rad) * ring.radius
            const isNamed = named === slug
            return (
              <Link
                key={slug}
                href={cardHref(slug)}
                className={`rose-pane ${isNamed ? 'is-named' : ''}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${ring.size}%`,
                }}
                title={`${series.title} · ${dayCountLabel(slug)}`}
                onMouseEnter={() => setFocused(slug)}
                onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(slug)}
                onBlur={() => setFocused(null)}
              >
                <span className="rose-glass">
                  <Plate
                    slug={slug}
                    sizes="(max-width: 700px) 22vw, 13vw"
                    eager
                  />
                </span>
                <span className="sr-only">
                  {series.title} — {dayCountLabel(slug)}
                </span>
              </Link>
            )
          }),
        )}

        {/* The hub: the oculus, and the one place a title is ever set at a
            size you can actually read. */}
        {namedSeries && (
          <Link
            href={cardHref(named)}
            className="rose-hub"
            onMouseEnter={() => setFocused(hub === named ? null : named)}
          >
            <span className="rose-hub-plate">
              <Plate slug={named} sizes="20vw" eager />
            </span>
            <span className="rose-hub-veil" aria-hidden="true" />
            <span className="rose-hub-copy">
              <span className="rose-hub-title">{namedSeries.title}</span>
              <span className="rose-hub-meta">
                {statusLabel(named, progressBySeries.get(named))}
              </span>
            </span>
          </Link>
        )}
      </div>

      <p className="rose-caption">
        {focused
          ? namedSeries?.question
          : 'Every reading we have, set as one window. Move across the glass.'}
      </p>
    </div>
  )
}

export function IssuesView({ slugs, progressBySeries, cardHref }: LayoutProps) {
  const ordered = useMemo(
    () => [...slugs].sort((a, b) => seriesRecencyRank(b) - seriesRecencyRank(a)),
    [slugs],
  )
  return (
    <ol className="issues">
      {ordered.map((slug) => {
        const series = SERIES_DATA[slug]
        if (!series) return null
        const no = seriesRecencyRank(slug) + 1
        return (
          <li key={slug} className="issue">
            <Link href={cardHref(slug)} className="issue-row">
              <span className="issue-no">
                <span className="issue-no-label">No.</span>
                {String(no).padStart(2, '0')}
              </span>
              <span className="issue-plate">
                <Plate slug={slug} sizes="90px" />
              </span>
              <span className="issue-copy">
                <span className="issue-title">{series.title}</span>
                <span className="issue-question">{series.question}</span>
              </span>
              <span className="issue-meta">
                {statusLabel(slug, progressBySeries.get(slug))}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export const LAYOUTS: Record<ViewId, (props: LayoutProps) => React.ReactElement> = {
  feature: FeatureView,
  rack: RackView,
  covers: CoversView,
  spines: SpinesView,
  list: ListView,
  mosaic: RoseView,
  issues: IssuesView,
}
