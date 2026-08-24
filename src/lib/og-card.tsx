/**
 * og-card.tsx
 *
 * Shared server-side OG / share-card render helper.
 *
 * Produces a duotone Federal Ultramarine + Deep Crimson on Cream Newsprint
 * card using next/og ImageResponse.  All routes that need an OG card
 * import from here so the visual language is consistent.
 *
 * DIMENSIONS:
 *   Primary:   1200 × 630  (standard Open Graph)
 *   Portrait:  1080 × 1350 (Instagram story / reels)
 *
 * PERSONAL-CONTENT SAFETY CONTRACT:
 *   Cards must NEVER include the reader's situation text, composed personal
 *   copy, or any AI-generated personalisation.  The allowed fields are:
 *     - verse text (Scripture, verbatim)
 *     - verse reference
 *     - series or page title
 *     - masthead + URL
 *   Any caller that passes `verse` MUST source it from the devotional's
 *   `passage` field (canonical Scripture), NOT from a user-submitted prompt
 *   or a generated-day composition.  The ShareButton component enforces this
 *   contract at the call-site; see src/components/ShareButton.tsx.
 */

import { ImageResponse } from 'next/og'

// ---------------------------------------------------------------------------
// Palette (duotone brand — Cobalt Triad light-mode)
// ---------------------------------------------------------------------------

const CREAM = '#F0ECE6' // Newspaper Cream
const NAVY = '#11182A' // Navy Ink
const COBALT = '#1F2A8D' // Federal Ultramarine
const CRIMSON = '#C4192E' // Deep Crimson (spot accent, used sparingly)
const AMBER = '#C8A56A' // Gold / amber accent

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

export interface OgCardProps {
  /** Main title — series, page, or edition name. */
  title: string
  /** Optional Scripture passage text (verbatim — never personal copy). */
  verse?: string
  /** Scripture reference, e.g. "John 15:4". */
  verseRef?: string
  /** Kicker / meta label above the title (e.g. "SUNDAY EDITION · WEEK 24"). */
  kicker?: string
  /** URL displayed in the footer, e.g. "EUANGELION.APP/SUNDAY". */
  url?: string
  /** Card dimensions. Default: 'landscape' (1200×630). */
  format?: 'landscape' | 'portrait'
  /**
   * The page's lead artwork, as a data URI or an absolute URL.
   *
   * When present the card becomes picture-led: the artwork takes the top of
   * the frame and the type drops into a panel beneath it. Without it the card
   * renders exactly as it always has, so every existing caller is unaffected.
   *
   * Prefer a data URI. Satori fetches remote URLs at render time, and on
   * Workers a cold fetch of our own asset is both slower and one more thing
   * that can fail; `loadLeadImage()` below does the fetch once and hands back
   * a data URI, falling back to the text card if the asset is missing.
   */
  image?: string
}

export const OG_SIZES = {
  landscape: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
}

// ---------------------------------------------------------------------------
// Core render function — returns a react-jsx tree for ImageResponse
// ---------------------------------------------------------------------------

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

/**
 * Render an OG card JSX tree (for use inside ImageResponse).
 * Exported separately so tests can inspect the tree without fetching fonts.
 */
export function renderOgCard({
  title,
  verse,
  verseRef,
  kicker,
  url = 'EUANGELION.APP',
  format = 'landscape',
  image,
}: OgCardProps): React.ReactElement {
  const { width, height } = OG_SIZES[format]
  const isPortrait = format === 'portrait'

  // Layout constants that scale with dimension
  const paddingH = isPortrait ? 72 : 80
  // With artwork above it the panel is short, so the type sits tighter and the
  // verse is dropped — a two-line title plus a URL is all that fits legibly at
  // the size these cards are actually previewed.
  const paddingV = image ? (isPortrait ? 44 : 38) : isPortrait ? 80 : 60
  const imageBandHeight = isPortrait ? 760 : 348

  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: CREAM,
        color: NAVY,
        fontFamily: 'serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Cobalt halftone stripe (top) ─────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 8,
          backgroundColor: COBALT,
          display: 'flex',
        }}
      />

      {/* ── Crimson accent line ───────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: CRIMSON,
          display: 'flex',
        }}
      />

      {/* ── Lead artwork ──────────────────────────────────────────── */}
      {image && (
        <div
          style={{
            display: 'flex',
            width,
            height: imageBandHeight,
            overflow: 'hidden',
            backgroundColor: NAVY,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            width={width}
            height={imageBandHeight}
            style={{ objectFit: 'cover', width, height: imageBandHeight }}
          />
        </div>
      )}

      {/* ── Main content area ─────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: `${paddingV + 16}px ${paddingH}px ${paddingV}px`,
          justifyContent: 'space-between',
        }}
      >
        {/* Top block: kicker + title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Masthead */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontFamily: 'sans-serif',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase' as const,
                color: COBALT,
              }}
            >
              EUANGELION
            </span>
            <span
              style={{
                width: 1,
                height: 12,
                backgroundColor: NAVY,
                opacity: 0.3,
                display: 'flex',
              }}
            />
            {kicker && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                  color: NAVY,
                  opacity: 0.7,
                }}
              >
                {kicker}
              </span>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: isPortrait ? 56 : 60,
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: NAVY,
              maxWidth: isPortrait ? width - paddingH * 2 : 900,
            }}
          >
            {truncate(title, isPortrait ? 80 : 72)}
          </div>
        </div>

        {/* Middle block: verse — omitted on picture-led cards, no room */}
        {verse && !image && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderLeft: `3px solid ${COBALT}`,
              paddingLeft: 28,
              maxWidth: isPortrait ? width - paddingH * 2 : 860,
            }}
          >
            <div
              style={{
                fontSize: isPortrait ? 26 : 28,
                fontStyle: 'italic',
                lineHeight: 1.5,
                color: NAVY,
                opacity: 0.9,
              }}
            >
              {truncate(verse, 200)}
            </div>
            {verseRef && (
              <div
                style={{
                  fontSize: 13,
                  fontFamily: 'sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: AMBER,
                }}
              >
                {verseRef}
              </div>
            )}
          </div>
        )}

        {/* Bottom: URL + cobalt footer bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontFamily: 'sans-serif',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color: NAVY,
              opacity: 0.45,
            }}
          >
            {url.toUpperCase()}
          </span>
          {/* Crimson ornament */}
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: CRIMSON,
              opacity: 0.18,
              display: 'flex',
            }}
          />
        </div>
      </div>

      {/* ── Bottom cobalt rule ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          backgroundColor: COBALT,
          display: 'flex',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// ImageResponse factory — call this in opengraph-image.tsx files
// ---------------------------------------------------------------------------

export function makeOgImageResponse(props: OgCardProps): ImageResponse {
  const format = props.format ?? 'landscape'
  const size = OG_SIZES[format]
  return new ImageResponse(renderOgCard(props), { ...size })
}

// ---------------------------------------------------------------------------
// Lead-artwork loading
// ---------------------------------------------------------------------------

/**
 * Where our own assets live at render time.
 *
 * Satori has no filesystem, so a lead image has to arrive over HTTP even when
 * it is our own file sitting in `public/`. In production that is the canonical
 * origin; locally it is whatever the dev server is on.
 */
function assetOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://euangelion.app'
  )
}

/**
 * Fetch a `public/` asset and return it as a data URI for Satori.
 *
 * Returns undefined rather than throwing. That matters: an OG route that
 * throws serves no card at all, and a link with no preview is a worse outcome
 * than a link with the old text-only preview. Every failure here degrades to
 * the typographic card instead.
 */
export async function loadLeadImage(
  publicPath: string,
): Promise<string | undefined> {
  try {
    const url = publicPath.startsWith('http')
      ? publicPath
      : `${assetOrigin()}${publicPath.startsWith('/') ? '' : '/'}${publicPath}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return undefined
    const type = res.headers.get('content-type') ?? 'image/png'
    // Satori renders png/jpeg reliably. It does NOT decode webp, which is what
    // most of our artwork is stored as — so a webp lead image must be declared
    // unsupported here rather than handed over to produce a blank band.
    if (!/image\/(png|jpe?g)/.test(type)) return undefined
    const buf = await res.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i])
    return `data:${type};base64,${btoa(binary)}`
  } catch {
    return undefined
  }
}

/**
 * Picture-led card factory: loads the artwork, then renders. Falls back to the
 * text card whenever the artwork cannot be loaded or decoded.
 */
export async function makeOgImageResponseWithLead(
  props: OgCardProps & { imagePath?: string },
): Promise<ImageResponse> {
  const { imagePath, ...rest } = props
  const image = imagePath ? await loadLeadImage(imagePath) : undefined
  const size = OG_SIZES[rest.format ?? 'landscape']
  return new ImageResponse(renderOgCard({ ...rest, image }), { ...size })
}
