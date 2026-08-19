'use client'

/**
 * The Gallery, as a spread (SA-092 / F-138).
 *
 * Founder: "Can be a full gallery with 7 images (lightbox)." One plate leads
 * at reading size; six sit as a contact row beneath. Any plate opens the
 * lightbox, which pages through all seven with the full Vasari entry — what
 * is literally shown, then the connoisseur's line. Keyboard: arrows, Escape.
 *
 * CONTAINER RULE: the spread never widens the sheet; the lightbox is a fixed
 * overlay with its own scroll.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { GalleryPayload } from '@/lib/edition/kinds'

export default function GallerySpread({
  plates,
}: {
  plates: GalleryPayload[]
}) {
  const [open, setOpen] = useState<number | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const show = plates.length
  const next = useCallback(
    () => setOpen((i) => (i === null ? null : (i + 1) % show)),
    [show],
  )
  const prev = useCallback(
    () => setOpen((i) => (i === null ? null : (i - 1 + show) % show)),
    [show],
  )

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    // Scroll lock while the lightbox is open; restore exactly what was there.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, next, prev])

  if (plates.length === 0) return null
  const lead = plates[0]
  const rest = plates.slice(1)
  const active = open === null ? null : plates[open]

  return (
    <section className="edition-gallery" aria-label="The gallery">
      <div className="edition-section-bar">
        <h2 className="edition-section-head">The gallery</h2>
        <p className="edition-section-note">
          {plates.length} plates &middot; tap any to look closer
        </p>
      </div>

      <figure className="edition-gallery-frame">
        <button
          type="button"
          className="edition-gallery-plate edition-gallery-open"
          onClick={() => setOpen(0)}
          aria-label={`Open ${lead.title} in the viewer`}
        >
          <Image
            src={lead.image}
            alt={lead.title}
            fill
            sizes="(max-width: 900px) 100vw, 58vw"
            className="edition-gallery-img"
          />
        </button>
        <figcaption className="edition-gallery-caption">
          <span className="edition-gallery-title">{lead.title}</span>
          {lead.artist.trim().toLowerCase() !== 'unknown' && (
            <span className="edition-gallery-artist">after {lead.artist}</span>
          )}
          <span className="edition-gallery-looking">{lead.looking}</span>
        </figcaption>
      </figure>

      {rest.length > 0 && (
        <div className="edition-gallery-row" role="list">
          {rest.map((p, i) => (
            <button
              key={p.image}
              type="button"
              role="listitem"
              className="edition-gallery-thumb"
              onClick={() => setOpen(i + 1)}
              aria-label={`Open ${p.title} in the viewer`}
            >
              <Image
                src={p.image}
                alt={p.title}
                fill
                sizes="(max-width: 900px) 33vw, 12vw"
                className="edition-gallery-img"
              />
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="edition-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} — plate ${(open ?? 0) + 1} of ${show}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null)
          }}
        >
          <div className="edition-lightbox-inner">
            <div className="edition-lightbox-bar">
              <span className="edition-lightbox-count">
                Plate {(open ?? 0) + 1} of {show}
              </span>
              <button
                ref={closeRef}
                type="button"
                className="edition-lightbox-btn"
                onClick={() => setOpen(null)}
              >
                Close ✕
              </button>
            </div>
            <div className="edition-lightbox-stage">
              <button
                type="button"
                className="edition-lightbox-btn edition-lightbox-nav"
                onClick={prev}
                aria-label="Previous plate"
              >
                ←
              </button>
              <div className="edition-lightbox-platewrap">
                {/* Full-resolution view; contain so the whole plate shows. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.image}
                  alt={active.title}
                  className="edition-lightbox-img"
                />
              </div>
              <button
                type="button"
                className="edition-lightbox-btn edition-lightbox-nav"
                onClick={next}
                aria-label="Next plate"
              >
                →
              </button>
            </div>
            <div className="edition-lightbox-card">
              <p className="edition-gallery-title">{active.title}</p>
              {active.artist.trim().toLowerCase() !== 'unknown' && (
                <p className="edition-gallery-artist">after {active.artist}</p>
              )}
              {active.shown && (
                <p className="edition-lightbox-shown">{active.shown}</p>
              )}
              {active.quality && (
                <p className="edition-lightbox-quality">{active.quality}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
