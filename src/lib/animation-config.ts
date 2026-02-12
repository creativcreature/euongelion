/**
 * Shared animation constants for GSAP and Framer Motion.
 *
 * Rule: GSAP owns scroll-linked animations.
 *       Framer Motion owns state-driven (hover, tap, mount/unmount).
 *       They NEVER control the same DOM element.
 */

// ============================================
// GSAP Timing & Easing
// ============================================

export const GSAP = {
  // Durations (seconds)
  duration: {
    fast: 0.3,
    base: 0.6,
    slow: 0.9,
    slower: 1.2,
    reveal: 0.8,
    stagger: 0.04,
  },

  // Easing (GSAP format)
  ease: {
    out: 'power2.out',
    inOut: 'power2.inOut',
    bounce: 'back.out(1.2)',
    smooth: 'power3.out',
    reveal: 'power4.out',
  },

  // Stagger configs
  stagger: {
    fast: { each: 0.03, from: 'start' as const },
    base: { each: 0.06, from: 'start' as const },
    slow: { each: 0.1, from: 'start' as const },
    grid: { each: 0.08, grid: 'auto' as const, from: 'start' as const },
  },

  // ScrollTrigger defaults
  scrollTrigger: {
    start: 'top 85%',
    end: 'bottom 15%',
    toggleActions: 'play none none none' as const,
  },

  // Motion profiles
  profiles: {
    editorialSubtle: {
      y: 14,
      duration: 0.62,
      ease: 'power2.out',
    },
    devotionalCinematic: {
      y: 34,
      duration: 1.05,
      ease: 'power4.out',
    },
  },

  // Auto-rotating rails
  rails: {
    intervalMs: 5800,
    transitionMs: 720,
    pauseAfterInteractionMs: 1500,
  },
} as const

// ============================================
// Framer Motion Variants (State-driven only)
// ============================================

export const FRAMER = {
  // Hover states
  hover: {
    scale: { scale: 1.02, transition: { duration: 0.2 } },
    lift: { y: -4, transition: { duration: 0.2 } },
    glow: { boxShadow: 'none', transition: { duration: 0.3 } },
  },

  // Tap states
  tap: {
    scale: { scale: 0.98 },
  },

  // Mount/unmount (AnimatePresence)
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },

  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
    exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
  },

  // Layout animation spring
  layout: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
} as const
