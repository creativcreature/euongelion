'use client'

import { useEffect, useRef } from 'react'

/**
 * Scroll motion (F-104).
 *
 * Founder 2026-08-16: "I want the entire site to have more livilieness and
 * scrolling animation and such… I would like moments of paralax, and just very
 * much surprising and engaging polish." Reference for feel:
 * oci.madebybuzzworthy.com.
 *
 * WHAT THIS IS AND IS NOT. It is one IntersectionObserver that adds a class
 * when an element first enters the viewport, plus a rAF-driven parallax for
 * elements that opt in. It is NOT a library, NOT a scroll-jacker, and it never
 * moves an element far enough to change where a reader thinks they are on the
 * page — this is a devotional, and motion that fights the scroll is motion
 * that fights the reading.
 *
 * FOUR RULES THIS FILE KEEPS.
 *
 * 1. Content is never hidden behind motion. Every animated element is fully
 *    visible with JavaScript off and stays visible if the observer never
 *    fires — the animation is an opacity/transform ON TOP of rendered content,
 *    applied by a class that only ever gets ADDED. Nothing here is display:none
 *    waiting for a script.
 * 2. Reveal happens ONCE. Elements are unobserved after firing, so scrolling
 *    back up does not replay the page.
 * 3. `prefers-reduced-motion` disables all of it, including parallax — checked
 *    at runtime rather than only in CSS, so the rAF loop never even starts.
 * 4. Parallax is capped. Nothing translates more than ±28px, which reads as
 *    depth without ever detaching an image from its caption. Layers EASE
 *    toward that target rather than tracking the scrollbar rigidly, so the
 *    motion has weight, and the loop parks itself once everything settles.
 */

const REVEAL_SELECTOR = '[data-reveal]'
const PARALLAX_SELECTOR = '[data-parallax]'

/** Maximum travel, in px, for any parallax layer. Depth, not drift. */
const MAX_PARALLAX = 28

export default function Reveal() {
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches) return

    // Mark the document so CSS can set the pre-reveal state ONLY when this
    // component is alive. Without JS the class never lands and everything is
    // simply visible — which is the fallback we want, not a blank page.
    document.documentElement.classList.add('motion-ready')

    const revealed = new WeakSet<Element>()

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || revealed.has(entry.target)) return
          revealed.add(entry.target)

          // Stagger children of a group so a row arrives in sequence rather
          // than as one block. The delay is per-element and tiny; anything
          // longer starts to feel like waiting.
          const el = entry.target as HTMLElement
          const index = Number(el.dataset.revealIndex ?? 0)
          el.style.transitionDelay = `${Math.min(index, 6) * 70}ms`
          el.classList.add('is-revealed')
          io.unobserve(entry.target)
        })
      },
      // Fire a little before the element is fully on screen, so the motion
      // completes as it settles rather than starting late.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )

    /**
     * FAIL OPEN. A reveal that never fires leaves content invisible, which is
     * strictly worse than no animation at all — and it happened: the home
     * page's three step cards sat at opacity 0 because the observer did not
     * fire for them. Two guards, both of which only ever REVEAL:
     *
     *   1. anything already within the viewport is revealed on the spot
     *   2. a sweep 2.5s after mount reveals anything still hidden
     *
     * Neither can hide anything. The worst case is that an element appears
     * without its animation, which is the correct way for this to degrade.
     */
    const revealNow = (el: Element) => {
      if (revealed.has(el)) return
      revealed.add(el)
      el.classList.add('is-revealed')
      io.unobserve(el)
    }

    const revealInView = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) revealNow(el)
      })
    }

    const observeAll = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        if (revealed.has(el)) return
        const node = el as HTMLElement
        if (!node.dataset.revealIndex) {
          // Index within the element's own parent, so staggering follows the
          // visual row rather than document order.
          const siblings = Array.from(node.parentElement?.children ?? [])
          node.dataset.revealIndex = String(
            siblings.filter((s) => s.hasAttribute('data-reveal')).indexOf(node),
          )
        }
        io.observe(el)
      })
    }
    observeAll()
    revealInView()

    // The failsafe. If anything is still hidden by now, the observer is not
    // going to save it.
    const failsafe = window.setTimeout(() => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach(revealNow)
    }, 2500)

    // Re-scan when client islands mount later (view toggles, tab switches).
    const mo = new MutationObserver(() => observeAll())
    mo.observe(document.body, { childList: true, subtree: true })

    // ── Parallax ──────────────────────────────────────────────────────
    //
    // Founder 2026-08-18: "Site wide animation paralaxing and such needs more
    // finesse and innovation."
    //
    // The old loop mapped scroll position straight to a transform, once per
    // scroll event. That is why it read mechanical: the layer was rigidly
    // pinned to the scrollbar, so it started and stopped in the same frame the
    // finger did, with no weight to it.
    //
    // This version gives the motion INERTIA. Each layer eases toward its target
    // rather than snapping to it, so it leads slightly into a scroll and
    // settles after one — the difference between a thing being dragged and a
    // thing having mass. The travel cap is unchanged at +/-28px, and the first
    // frame snaps to target so nothing slides in from zero on load.
    //
    // It also STOPS. The loop runs while anything is still moving and shuts
    // itself down once every layer has settled, so a still page costs nothing.
    const layers = () =>
      Array.from(document.querySelectorAll<HTMLElement>(PARALLAX_SELECTOR))

    /** Per-frame approach rate. Lower is heavier. */
    const EASE = 0.12
    /** Frames of stillness before the loop parks itself. */
    const IDLE_FRAMES_BEFORE_PARK = 24

    const current = new WeakMap<HTMLElement, number>()
    let running = false
    let idleFrames = 0

    const tick = () => {
      const vh = window.innerHeight
      let moving = false

      layers().forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.bottom < -200 || rect.top > vh + 200) return

        // -1 at the bottom of the viewport, +1 at the top: a signed measure of
        // how far past centre the element has travelled.
        const progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2)
        const depth = Number(el.dataset.parallax || '1')
        const target = Math.max(
          -MAX_PARALLAX,
          Math.min(MAX_PARALLAX, progress * depth * MAX_PARALLAX),
        )

        // No entry animation: an element seen for the first time is already
        // where it belongs.
        const from = current.get(el) ?? target
        const next = from + (target - from) * EASE
        current.set(el, next)

        if (Math.abs(target - next) > 0.05) moving = true
        el.style.setProperty('--parallax-y', `${next.toFixed(2)}px`)
      })

      idleFrames = moving ? 0 : idleFrames + 1
      if (idleFrames > IDLE_FRAMES_BEFORE_PARK) {
        running = false
        frame.current = null
        return
      }
      frame.current = window.requestAnimationFrame(tick)
    }

    const wake = () => {
      idleFrames = 0
      if (running) return
      running = true
      frame.current = window.requestAnimationFrame(tick)
    }

    wake()
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('resize', wake, { passive: true })

    return () => {
      window.clearTimeout(failsafe)
      io.disconnect()
      mo.disconnect()
      window.removeEventListener('scroll', wake)
      window.removeEventListener('resize', wake)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
      document.documentElement.classList.remove('motion-ready')
    }
  }, [])

  return null
}
