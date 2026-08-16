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
 *    depth without ever detaching an image from its caption.
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
    const layers = () =>
      Array.from(document.querySelectorAll<HTMLElement>(PARALLAX_SELECTOR))

    const onScroll = () => {
      if (frame.current !== null) return
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null
        const vh = window.innerHeight
        layers().forEach((el) => {
          const rect = el.getBoundingClientRect()
          if (rect.bottom < -200 || rect.top > vh + 200) return
          // -1 at the bottom of the viewport, +1 at the top: a signed measure
          // of how far past centre the element has travelled.
          const progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2)
          const depth = Number(el.dataset.parallax || '1')
          const shift = Math.max(
            -MAX_PARALLAX,
            Math.min(MAX_PARALLAX, progress * depth * MAX_PARALLAX),
          )
          el.style.setProperty('--parallax-y', `${shift.toFixed(2)}px`)
        })
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.clearTimeout(failsafe)
      io.disconnect()
      mo.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
      document.documentElement.classList.remove('motion-ready')
    }
  }, [])

  return null
}
