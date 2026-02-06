# wokeGod Scroll Experience

**Version:** 1.0  
**Last Updated:** January 16, 2026

## PHILOSOPHY

**The Daily Bread is not a social feed. It's a living manuscript—a scroll that reveals layers to those who look deeper.**

Reference: Ship of Theseus + Tandem Co sectioned storytelling

## THE PARADOX

"Teeming with life" + "Stark and meditative"

Solution: Container = stark, Content = alive (dropdowns, hovers, surprises)

## PaRDeS AS UX

- P'shat (Surface): Clean scroll, primary content
- Remez (Hint): Hover states, subtle animations
- Drash (Seek): Dropdowns, expandables
- Sod (Secret): Easter eggs, margin notes, third-visit rewards

## SECTION STRUCTURE

Each day = 6-10 full-viewport sections (100vh each)

- Day number screen
- Hero image (full-bleed)
- Title + theme
- Body text chunks
- Hebrew word study
- Pull quote
- Reflection questions
- Prayer/closing
- Next day teaser

## SCROLL ANIMATIONS

- Fade in + slide up (600ms, ease-out-expo)
- Trigger at 20% from bottom of viewport
- Stagger multiple elements (100ms delay between)
- Parallax on hero images (0.7x speed, subtle)

## INTERACTIONS

1. Hover Reveals: Hebrew words show pronunciation
2. Dropdowns: "Go Deeper" expandables (400ms)
3. Sticky Elements: Progress bar, minimal nav
4. Mobile: Native scroll, no parallax, larger touch targets

## EASTER EGGS (Sod Layer)

- Handwritten margin notes (appear on repeat visit)
- Hebrew letter pictographic meanings
- Chiastic visual echoes (Day 1 mirrors Day 5)
- Hidden blessings in seemingly empty space

## PERFORMANCE

- Lazy load images (loading="lazy")
- IntersectionObserver for scroll triggers
- Debounce scroll events
- Respect prefers-reduced-motion

[See full scroll-experience.md for complete specifications]
