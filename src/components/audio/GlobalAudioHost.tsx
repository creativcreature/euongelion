'use client'

import { useEffect, useRef } from 'react'
import { registerAudioElement } from '@/lib/audio/audio-element'
import { pushPosition, readLocalPosition } from '@/lib/audio/listening-progress'
import { currentItem, useAudioStore } from '@/stores/audioStore'

const SPEED_KEY = 'euangelion:narration-speed'

function storedSpeed(): number {
  if (typeof window === 'undefined') return 1
  const raw = Number(window.localStorage.getItem(SPEED_KEY))
  return Number.isFinite(raw) && raw > 0 ? raw : 1
}

/**
 * The site's one audio element, mounted above every route.
 *
 * Everything audio-forward depends on this existing: a media element rendered
 * inside a page is destroyed when Next swaps routes, so playback that lives in
 * the reader cannot survive the reader being left. Hoisting it is the whole
 * of stage 2, and it is invisible on the day it lands.
 *
 * It renders no UI. `GlobalAudioBar` is the visible surface; the reader's
 * panel drives this same element through `getAudioElement()`, so there is
 * never a second one to fall out of sync with.
 */
export default function GlobalAudioHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const queue = useAudioStore((s) => s.queue)
  const index = useAudioStore((s) => s.index)
  const next = useAudioStore((s) => s.next)
  const setPlaying = useAudioStore((s) => s.setPlaying)
  const item = currentItem({ queue, index })

  // Publish the element so the reader panel and the bar drive this one.
  useEffect(() => {
    registerAudioElement(audioRef.current)
    return () => registerAudioElement(null)
  }, [])

  /**
   * Load the item under the cursor, and keep playing across a queue advance.
   *
   * `wasPlaying` is read from the element rather than the store because the
   * store's `playing` is written from events and lags a beat behind a manual
   * `next()`. Reading the element asks the only source that cannot be stale.
   */
  const lastSrc = useRef<string | null>(null)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !item) return
    if (lastSrc.current === item.src) return
    const wasPlaying = lastSrc.current !== null && !audio.paused
    lastSrc.current = item.src
    audio.src = item.src
    audio.playbackRate = storedSpeed()
    audio.preservesPitch = true

    const saved = readLocalPosition(item.slug)
    // Never resume within the last 15s: that is a finished reading, and
    // dropping someone at the closing sentence reads as a bug rather than a
    // courtesy.
    if (saved && saved.seconds > 0 && saved.seconds < item.duration - 15) {
      const apply = () => {
        audio.currentTime = saved.seconds
        audio.removeEventListener('loadedmetadata', apply)
      }
      audio.addEventListener('loadedmetadata', apply)
    }
    if (wasPlaying) void audio.play().catch(() => {})
  }, [item])

  // Transport state, position, and auto-advance.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      const finished = currentItem(useAudioStore.getState())
      if (finished) {
        pushPosition({
          slug: finished.slug,
          seconds: 0,
          duration: finished.duration,
          listenedDelta: 0,
          ended: true,
          flush: true,
        })
      }
      // Auto-advance everywhere (SA-096). A queue that stops between items is
      // not a queue; the founder's ruling is that finishing a series in one
      // sitting is a good outcome, not one to guard against.
      if (!useAudioStore.getState().next()) setPlaying(false)
    }
    const onTimeUpdate = () => {
      const playing = currentItem(useAudioStore.getState())
      if (!playing || audio.paused) return
      pushPosition({
        slug: playing.slug,
        seconds: audio.currentTime,
        duration: audio.duration || playing.duration,
        listenedDelta: 0,
      })
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
  }, [next, setPlaying])

  // Lock screen and hardware keys. This is what a media element buys that
  // speechSynthesis never could.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
      return
    if (!item) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.context ?? 'Euangelion',
      album: useAudioStore.getState().label ?? 'Euangelion',
    })
    const audio = audioRef.current
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Not every action is supported on every platform; an unsupported one
        // throws rather than no-opping, and must not take the rest down.
      }
    }
    set('play', () => void audio?.play().catch(() => {}))
    set('pause', () => audio?.pause())
    set('nexttrack', () => useAudioStore.getState().next())
    set('previoustrack', () => useAudioStore.getState().previous())
    return () => {
      set('play', null)
      set('pause', null)
      set('nexttrack', null)
      set('previoustrack', null)
    }
  }, [item])

  return <audio ref={audioRef} preload="metadata" hidden />
}
