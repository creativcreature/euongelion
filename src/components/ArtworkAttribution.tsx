import type { ArtworkEntry } from '@/data/artwork-manifest'

interface ArtworkAttributionProps {
  artwork: ArtworkEntry
  variant?: 'compact' | 'full'
  className?: string
}

/**
 * ArtworkAttribution — renders artwork metadata.
 *
 * compact: "Title" — Artist, Year  (inline use)
 * full:    Title / Artist, Year / Medium | Museum / License  (lightbox museum card)
 */
export default function ArtworkAttribution({
  artwork,
  variant = 'compact',
  className = '',
}: ArtworkAttributionProps) {
  if (variant === 'compact') {
    return (
      <p
        className={`artwork-attribution artwork-attribution-compact ${className}`}
      >
        <span className="artwork-attribution-title">
          &ldquo;{artwork.title}&rdquo;
        </span>
        {artwork.artist && artwork.artist !== 'Unknown' && (
          <>
            {' '}
            &mdash;{' '}
            <span className="artwork-attribution-artist">{artwork.artist}</span>
          </>
        )}
        {artwork.year && (
          <>
            , <span className="artwork-attribution-year">{artwork.year}</span>
          </>
        )}
      </p>
    )
  }

  // Full museum card variant
  return (
    <div
      className={`artwork-attribution artwork-attribution-full ${className}`}
    >
      <p className="artwork-attribution-title-full">{artwork.title}</p>
      <p className="artwork-attribution-artist-full">
        {artwork.artist}
        {artwork.year && <>, {artwork.year}</>}
      </p>
      {(artwork.medium || artwork.museum) && (
        <p className="artwork-attribution-meta">
          {artwork.medium && (
            <span className="artwork-attribution-medium">
              {artwork.medium.charAt(0).toUpperCase() + artwork.medium.slice(1)}
            </span>
          )}
          {artwork.medium && artwork.museum && ' · '}
          {artwork.museum && (
            <span className="artwork-attribution-museum">{artwork.museum}</span>
          )}
        </p>
      )}
      {artwork.license && (
        <p className="artwork-attribution-license">{artwork.license}</p>
      )}
    </div>
  )
}
