'use client'

/**
 * A stored image that degrades to type (plan §55). The build checks every
 * stored plate and strip before it is frozen, but a published paper lives for
 * years and a file can go missing after the fact. When the browser cannot load
 * the image, the wrapper renders `fallback` instead: nothing for a decorative
 * lead plate (the headline carries the lead), the strip's own words for Echo &
 * Dust. A reader never sees a broken-image box.
 */
import Image, { type ImageProps } from 'next/image'
import { useState, type ReactNode } from 'react'

export default function PlateImage({
  wrapperClassName,
  fallback,
  ...image
}: ImageProps & { wrapperClassName: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <span className={wrapperClassName}>
      <Image {...image} alt={image.alt} onError={() => setFailed(true)} />
    </span>
  )
}
