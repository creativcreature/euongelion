import Image from 'next/image'

export type PrintEffect = 'woodblock' | 'halftone' | 'dither' | 'ink' | 'none'

interface IllustrationFrameProps {
  src?: string | null
  alt: string
  caption?: string
  className?: string
  effect?: PrintEffect
  aspect?: 'portrait' | 'landscape' | 'square' | 'banner'
  priority?: boolean
  decorative?: boolean
  wordblock?: string
}

const ASPECT_CLASS: Record<
  NonNullable<IllustrationFrameProps['aspect']>,
  string
> = {
  portrait: 'aspect-[4/5]',
  landscape: 'aspect-[16/10]',
  square: 'aspect-square',
  banner: 'aspect-[21/8]',
}

export default function IllustrationFrame({
  src,
  alt,
  caption,
  className = '',
  effect = 'woodblock',
  aspect = 'portrait',
  priority = false,
  decorative = false,
  wordblock,
}: IllustrationFrameProps) {
  const effectClass = effect === 'none' ? '' : `effect-${effect}`

  return (
    <figure className={`illustration-frame ${className}`.trim()}>
      <div
        className={`illustration-plate ${ASPECT_CLASS[aspect]} ${effectClass}`.trim()}
      >
        {src ? (
          src.startsWith('/') ? (
            <Image
              src={src}
              alt={decorative ? '' : alt}
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="object-cover"
              priority={priority}
              aria-hidden={decorative}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={decorative ? '' : alt}
              className="h-full w-full object-cover"
              loading={priority ? 'eager' : 'lazy'}
              aria-hidden={decorative}
            />
          )
        ) : (
          <div className="illustration-placeholder" aria-hidden="true" />
        )}
        {wordblock && (
          <span className="illustration-wordblock text-label">{wordblock}</span>
        )}
      </div>
      {caption && (
        <figcaption className="vw-small text-secondary">{caption}</figcaption>
      )}
    </figure>
  )
}
