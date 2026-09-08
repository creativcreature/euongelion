'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAnimation } from '@/providers/AnimationProvider'

const REVEAL_SELECTOR = [
  '.mock-paper :is(h1, h2, h3, h4, p, li, blockquote, figcaption)',
  '.newspaper-home :is(h1, h2, h3, h4, p, li, blockquote, figcaption)',
  '.newspaper-reading :is(h1, h2, h3, h4, p, li, blockquote, figcaption)',
  '.newspaper-reading-main :is(h1, h2, h3, h4, p, li, blockquote, figcaption)',
].join(', ')

const INTERACTIVE_SELECTOR = [
  '.mock-paper a[href]',
  '.mock-paper button',
  '.newspaper-home a[href]',
  '.newspaper-home button',
  '.newspaper-reading a[href]',
  '.newspaper-reading button',
  '.newspaper-reading-main a[href]',
  '.newspaper-reading-main button',
].join(', ')

function shouldSkipReveal(node: HTMLElement): boolean {
  if (node.dataset.editorialNoReveal === 'true') return true
  if (node.closest('nav, .mock-topbar, .mock-nav, .skip-to-content'))
    return true
  if (node.closest('[aria-hidden="true"]')) return true
  if (node.matches('.mock-topbar-mobile-item')) return true

  const text = node.textContent?.trim() ?? ''
  if (!text) return true

  // Keep very long dense blocks stable for reading comfort and perf.
  if (node.tagName === 'P' && text.length > 900) return true

  return false
}

function shouldSkipInteractive(node: HTMLElement): boolean {
  if (node.dataset.noInkLine === 'true') return true
  if (node.closest('nav, .mock-topbar, .mock-nav, .mock-account-menu'))
    return true
  if (node.closest('[aria-hidden="true"]')) return true
  if (node.matches('button:disabled,[aria-disabled="true"]')) return true

  if (
    node.matches(
      '.animated-underline, .cta-major, .mock-arrow, .mock-nav-mobile-theme-toggle',
    )
  ) {
    return true
  }

  const text = node.textContent?.trim() ?? ''
  const hasOnlyIcon = text.length <= 2 && node.querySelector('svg')
  if (hasOnlyIcon) return true

  return false
}

function setEmphasisPrepared(node: HTMLElement, shouldAnimate: boolean) {
  const emphasisNodes = node.querySelectorAll<HTMLElement>('strong, b, em, i')
  emphasisNodes.forEach((item, index) => {
    item.classList.add('editorial-emphasis')
    item.style.setProperty('--editorial-emphasis-delay', `${80 + index * 60}ms`)

    if (!shouldAnimate) {
      item.style.removeProperty('opacity')
      item.style.removeProperty('transform')
    }
  })
}

function collectMatches(root: Element, selector: string): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector))
  if (root instanceof HTMLElement && root.matches(selector)) {
    nodes.unshift(root)
  }
  return nodes
}

export default function EditorialMotionSystem() {
  const pathname = usePathname()
  const { shouldAnimate } = useAnimation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const prepared = new WeakSet<HTMLElement>()
    const pendingRoots = new Set<Element>()
    let frame = 0

    // Reveal-on-scroll needs BOTH motion-allowed AND a working
    // IntersectionObserver. If IO is unavailable (very old browsers), we must NOT
    // hide content — it would never reveal. Treat it like reduced-motion and show
    // everything immediately. (No-JS already stays visible: the hide is a
    // JS-added class, so without JS nothing is ever hidden.)
    const canObserve =
      shouldAnimate && typeof IntersectionObserver !== 'undefined'

    const observer = canObserve
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return
              const el = entry.target as HTMLElement
              el.classList.add('is-visible')
              observer?.unobserve(el)
            })
          },
          {
            root: null,
            threshold: 0.12,
            rootMargin: '0px 0px -8% 0px',
          },
        )
      : null

    const prepareReveal = (node: HTMLElement) => {
      if (prepared.has(node) || shouldSkipReveal(node)) return
      prepared.add(node)

      node.classList.add('editorial-reveal-target')
      setEmphasisPrepared(node, shouldAnimate)

      if (!shouldAnimate) {
        node.classList.add('is-visible')
        return
      }

      const viewportHeight = window.innerHeight || 900
      const rect = node.getBoundingClientRect()
      const shouldShowImmediately = rect.top < viewportHeight * 0.86

      if (shouldShowImmediately) {
        node.classList.add('is-visible')
        return
      }

      node.classList.add('is-prepared')
      observer?.observe(node)
    }

    const prepareInteractive = (node: HTMLElement) => {
      if (shouldSkipInteractive(node)) return
      if (node.classList.contains('ink-line-interactive')) return
      node.classList.add('ink-line-interactive')
      node.classList.add(node.tagName === 'A' ? 'ink-link' : 'ink-button')
    }

    const scanRoot = (root: Element) => {
      const revealNodes = collectMatches(root, REVEAL_SELECTOR)
      revealNodes.forEach(prepareReveal)

      const interactiveNodes = collectMatches(root, INTERACTIVE_SELECTOR)
      interactiveNodes.forEach(prepareInteractive)
    }

    const flushPendingScan = () => {
      frame = 0
      if (pendingRoots.size === 0) return
      const roots = Array.from(pendingRoots)
      pendingRoots.clear()
      roots.forEach(scanRoot)
    }

    const queueRootScan = (root: Element) => {
      pendingRoots.add(root)
      if (frame) return
      frame = window.requestAnimationFrame(flushPendingScan)
    }

    scanRoot(document.body)

    // SA-137 — the scroll-past sweep. IntersectionObserver only delivers a
    // callback when the intersection ratio CROSSES a threshold between two
    // samples. On a fast wheel scroll an element can travel from below the
    // fold to above it inside one sample gap: the ratio goes 0 -> 0, nothing
    // crosses 0.12, and no entry is ever emitted. The element keeps
    // `is-prepared` and sits at opacity 0 permanently, because a reader moving
    // down a page never scrolls back up to give it a second chance.
    //
    // Measured on production 2026-09-08: ordinary wheel scrolling left 32 of
    // 96 targets invisible on the homepage and 12-13 on a series page —
    // including day titles, their READ links, the footer copyright and version
    // line, and the entire heading and body of the Georgia outreach band. It
    // did not reproduce under a programmatic jump to the bottom, which is why
    // it survived: every automated check arrives instantly.
    //
    // The sweep is the backstop, not a replacement. IO still does the work and
    // still drives the staggered reveal; this only catches what it skipped,
    // and only ever reveals — it never re-hides.
    const sweepScrolledPast = () => {
      if (!canObserve) return
      const viewportHeight = window.innerHeight || 900
      document
        .querySelectorAll<HTMLElement>('.editorial-reveal-target.is-prepared')
        .forEach((el) => {
          if (el.classList.contains('is-visible')) return
          // Anything whose top has reached the fold has been given its chance.
          // Reveal it rather than leave it stranded.
          if (el.getBoundingClientRect().top < viewportHeight) {
            el.classList.add('is-visible')
            observer?.unobserve(el)
          }
        })
    }

    let sweepFrame = 0
    const queueSweep = () => {
      if (sweepFrame) return
      sweepFrame = window.requestAnimationFrame(() => {
        sweepFrame = 0
        sweepScrolledPast()
      })
    }

    // Coalesced to one frame (SA-129: PrintRail scheduled a fresh rAF per
    // scroll event and re-read layout many times per frame).
    window.addEventListener('scroll', queueSweep, { passive: true })
    window.addEventListener('resize', queueSweep, { passive: true })

    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          queueRootScan(node)
        })
      })
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (sweepFrame) window.cancelAnimationFrame(sweepFrame)
      window.removeEventListener('scroll', queueSweep)
      window.removeEventListener('resize', queueSweep)
      mutationObserver.disconnect()
      observer?.disconnect()
    }
  }, [pathname, shouldAnimate])

  return null
}
