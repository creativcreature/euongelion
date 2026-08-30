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
 * WHY THE FILE IS FETCHED INTO A BLOB FIRST
 * -----------------------------------------
 * Cloudflare Workers' asset handler does not answer HTTP Range requests for
 * this bundle — `Range: bytes=0-1023` comes back `200` with the whole file and
 * no `Accept-Ranges`. Chrome will not seek a progressive video it cannot range-
 * request, so `video.seekable` is an empty [0,0] range and every write to
 * `currentTime` silently reads back 0. The scrub looked implemented and did
 * nothing. Downloading once and pointing the element at an object URL makes the
 * media local, so seeking is instant and exact. It costs the same bytes and
 * scrubs more smoothly than range seeking would.
 *
 * The other three things this has to survive, all mobile Safari:
 *  1. iOS refuses to decode a video that is not `muted` + `playsInline`.
 *  2. Seeking on every scroll event stutters, so we lerp toward the target in a
 *     single rAF loop and only write when the delta is worth a frame.
 *  3. `prefers-reduced-motion` gets a still image — the video is never mounted.
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
  // null while downloading; the blob URL once local; the raw path if the fetch
  // failed, so a bad network still yields a poster and a playable element.
  const [mediaSrc, setMediaSrc] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Pull the film down once and hand the element a seekable local copy.
  useEffect(() => {
    if (reduced) return
    let cancelled = false
    let objectUrl: string | null = null

    fetch(src)
      .then((r) =>
        r.ok ? r.blob() : Promise.reject(new Error(String(r.status))),
      )
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setMediaSrc(objectUrl)
      })
      .catch(() => {
        // Fall back to the network path. Scrubbing will not work without range
        // support, but the poster and first frame still render.
        if (!cancelled) setMediaSrc(src)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, reduced])

  useEffect(() => {
    if (reduced || !mediaSrc) return
    const section = sectionRef.current
    const video = videoRef.current
    if (!section || !video) return

    let raf = 0
    let current = 0
    let running = true

    const measure = () => {
      const rect = section.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) return 0
      return Math.min(Math.max(-rect.top, 0), scrollable) / scrollable
    }

    const tick = () => {
      if (!running) return
      const target = measure()
      // Ease toward the target so a flung scroll does not machine-gun seeks.
      current += (target - current) * 0.12
      const { duration } = video
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
  }, [reduced, mediaSrc])

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
            {...(mediaSrc ? { src: mediaSrc } : {})}
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
