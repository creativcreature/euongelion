'use client'

import Image from 'next/image'
import ArtworkAttribution from '@/components/ArtworkAttribution'
import type { ArtworkEntry } from '@/data/artwork-manifest'

interface DevotionalArtworkProps {
  artwork: ArtworkEntry
  onOpenLightbox?: () => void
}

/**
 * DevotionalArtwork — cinematic inline artwork in the devotional reading flow.
 *
 * Renders dark/light print variants with CSS-only theme switching.
 * Click opens lightbox gallery.
 */
export default function DevotionalArtwork({
  artwork,
  onOpenLightbox,
}: DevotionalArtworkProps) {
  return (
    <figure className="devotional-artwork">
      <div
        className="devotional-artwork-frame"
        role="button"
        tabIndex={0}
        onClick={onOpenLightbox}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpenLightbox?.()
          }
        }}
        aria-label={`View "${artwork.title}" in gallery`}
      >
        <Image
          src={artwork.src}
          alt={`${artwork.title} by ${artwork.artist}`}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1024px) 66vw, 700px"
          className="devotional-artwork-img"
          loading="lazy"
        />
      </div>
      <figcaption>
        <ArtworkAttribution artwork={artwork} variant="compact" />
      </figcaption>
    </figure>
  )
}
