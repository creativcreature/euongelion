'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  poster: string
  /** How tall the scroll track is, in viewport heights. */
  track?: number
  /** Lines that hand off across the scrub. Each owns a slice of the track. */
  beats: string[]
}

/**
 * The door.
 *
 * Not a numbered room — the seven rooms are the story, and this is what you pass
 * through to reach them. Scroll position drives `video.currentTime` rather than
 * the video playing itself: Apple's technique, which its own AirPods Pro markup
 * calls `scroll-gallery`. Apple moved to video scrubbing FROM frame-by-frame
 * image sequences, trading microscopic precision for perceived smoothness and
 * ~80% smaller assets, so this is the current form, not the dated one.
 *
 * WHAT THE SCROLL MEANS HERE. The film is darkness over the deep with light
 * breaking along the horizon. So the reader's own scroll is what brings the
 * light up — the single most on-the-nose piece of directed motion available to
 * this page, and the reason it is not decoration: it is Genesis 1:3 performed by
 * the person reading it.
 *
 * BEATS, NOT ONE FADE. The first build ran one block of copy that reached 0.15
 * opacity at the halfway mark of a 320vh track and stayed there — ~160vh of
 * nothing, which the founder correctly called a completely blank section. The
 * copy is now N beats, each owning a slice of the track and crossing over its
 * neighbour, so no point in the scrub is ever empty.
 *
 * WHY THE FILE IS FETCHED INTO A BLOB. Cloudflare Workers' asset handler does
 * not answer HTTP Range requests for this bundle — `Range: bytes=0-1023` returns
 * 200 with the whole file and no `Accept-Ranges`. Chrome will not seek a
 * progressive video it cannot range-request, so `video.seekable` is `[0,0]` and
 * every write to `currentTime` silently reads back 0. Downloading once and
 * pointing the element at an object URL makes the media local: seeking is then
 * instant and exact.
 */
export default function ScrubbedFilm({
  src,
  poster,
  track = 220,
  beats,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [reduced, setReduced] = useState(false)
  const [mediaSrc, setMediaSrc] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

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
      current += (measure() - current) * 0.12
      const { duration } = video
      if (Number.isFinite(duration) && duration > 0) {
        const t = current * duration
        if (Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t
      }
      section.style.setProperty('--film-progress', current.toFixed(4))
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
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
      className="wig-door"
      style={{ height: `${track}vh` }}
      data-beats={beats.length}
    >
      <div className="wig-door-stage">
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="wig-door-media"
            src={poster}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <video
            ref={videoRef}
            className="wig-door-media"
            {...(mediaSrc ? { src: mediaSrc } : {})}
            poster={poster}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
        <div className="wig-door-veil" aria-hidden="true" />

        <div className="wig-door-copy">
          {/* h1 carries the whole opening for assistive tech, in reading order,
              regardless of which beat is visually forward. */}
          <h1 className="sr-only">{beats.join(' ')}</h1>
          {beats.map((b, i) => (
            <p
              key={b}
              className="wig-beat"
              aria-hidden="true"
              style={
                {
                  '--i': i,
                  '--n': beats.length,
                } as React.CSSProperties
              }
            >
              {b}
            </p>
          ))}
        </div>

        <p className="wig-door-hint" aria-hidden="true">
          Scroll
        </p>
      </div>
    </div>
  )
}
