'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  /** Public path to the mp4. */
  src: string
  /** Poster frame — also the whole experience when motion is reduced. */
  poster: string
  /** How tall the scroll track is, in viewport heights. */
  track?: number
  children?: React.ReactNode
}

/**
 * Scroll-scrubbed film. The Apple product-page technique: the page scroll
 * position drives `video.currentTime` rather than the video playing itself.
 *
 * Three things this has to survive, all learned the hard way on mobile Safari:
 *  1. iOS refuses to decode a video that is not `muted` + `playsInline`, and
 *     will not seek at all until it has metadata — so we gate on `loadeddata`.
 *  2. Seeking on every scroll event stutters. We lerp toward the target inside
 *     a single rAF loop and only write `currentTime` when the delta is worth it.
 *  3. `prefers-reduced-motion` must get a still frame, not a frozen video
 *     element — so the video is never mounted in that case.
 */
export default function ScrubbedFilm({
  src,
  poster,
  track = 300,
  children,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    let raf = 0
    let target = 0
    let current = 0
    let running = true

    const measure = () => {
      const rect = section.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) return 0
      const passed = Math.min(Math.max(-rect.top, 0), scrollable)
      return passed / scrollable
    }

    const tick = () => {
      if (!running) return
      target = measure()
      // Ease toward the target so a flung scroll does not machine-gun seeks.
      current += (target - current) * 0.12
      const duration = video.duration
      if (Number.isFinite(duration) && duration > 0) {
        const t = current * duration
        if (Math.abs(video.currentTime - t) > 1 / 60) {
          video.currentTime = t
        }
      }
      section.style.setProperty('--film-progress', current.toFixed(4))
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      setReady(true)
      raf = requestAnimationFrame(tick)
    }

    if (video.readyState >= 2) start()
    else video.addEventListener('loadeddata', start, { once: true })

    return () => {
      running = false
      cancelAnimationFrame(raf)
      video.removeEventListener('loadeddata', start)
    }
  }, [reduced])

  return (
    <div
      ref={sectionRef}
      className="wig-film"
      style={{ height: `${track}vh` }}
      data-ready={ready ? 'true' : 'false'}
    >
      <div className="wig-film-stage">
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="wig-film-media"
            src={poster}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <video
            ref={videoRef}
            className="wig-film-media"
            src={src}
            poster={poster}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
        <div className="wig-film-veil" aria-hidden="true" />
        <div className="wig-film-copy">{children}</div>
      </div>
    </div>
  )
}
