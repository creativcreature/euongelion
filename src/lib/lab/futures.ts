/**
 * LAB — the futures registry.
 *
 * Founder 2026-08-28: "I want 7 unique explorable and interactable options…
 * 7 concepts (14 looks, because both devotional and daily bread needs
 * exploratory options)… We can get very weird and cool with it."
 *
 * WHAT THESE ARE. Each concept is a TREATMENT applied over the REAL surface —
 * today's actual Daily Bread rendered by the real EditionPage, and a real
 * devotional rendered by the real DevotionalPageClient. Nothing here is a
 * mockup. That is the founder's standing rule for interactive proposals
 * (2026-08-20: "they need to actually exist in the page as actual content"),
 * and it is also the only honest way to judge a treatment: a look that only
 * survives on invented content is not a look, it is a poster.
 *
 * WHAT THEY ARE NOT. None of these is a filter dropped on top. Each makes a
 * different CLAIM about what the site is, and the visual language is derived
 * from that claim. Where a treatment could not justify an effect by what it
 * means, the effect was cut.
 *
 * THE RULE THEY ALL OBEY: an effect earns its place only if it carries meaning
 * or state. Ambient decoration is a skin; a scanline that IS the loading
 * progress, or a dot ramp that IS depth, is the thing itself.
 *
 * THE WORD IS NEVER TREATED. Scripture and devotional prose render clean in
 * every concept. The machine carries you to the page; the page is then a page.
 * That is a constraint, not a default — the one place all seven agree.
 */

export type SurfaceId = 'devotional' | 'paper'

export interface FutureConcept {
  id: string
  name: string
  /** The claim, in one line. This is what the concept argues, not what it does. */
  claim: string
  /** How the claim becomes visual language. */
  how: string
  /** What the reader can actually do — every concept is interactive. */
  interaction: string
  /** Where the idea comes from, so the lineage is inspectable. */
  lineage: string
  /** Honest cost/risk, so no option is flattered. */
  risk: string
  /** Accent used for the concept's own chrome in the picker. */
  accent: string
}

export const FUTURES: FutureConcept[] = [
  {
    id: 'bayer',
    name: 'Bayer',
    claim:
      'Dither is not a texture. It is what happens when something continuous is forced into a finite palette so it can be carried — the infinite made receivable.',
    how: 'Every plate is quantised live through an ordered 4×4 Bayer matrix into the brand’s own two inks. Depth of field becomes depth of dot. Nothing is greyscale; every shadow is dot density, which is already the house rule.',
    interaction:
      'Scrub the matrix size and the level count and watch a photograph collapse into cobalt and cream in real time. Hold a plate to see its source.',
    lineage:
      'Ordered (Bayer) dithering; the site’s existing Ben-Day dot field and the “no greys — every shadow is dot density” rule in CLAUDE.md.',
    risk: 'Per-pixel work on large plates. Must be cached and never run on the reading surface.',
    accent: '#1f2a8d',
  },
  {
    id: 'phosphor',
    name: 'Phosphor',
    claim:
      'The page is not paper being photographed. It is a lit display, and it admits it.',
    how: 'Scanline, bloom, a faint barrel curve, and persistence: things that leave the screen leave a trace before they go. The masthead powers on rather than fading in.',
    interaction:
      'A power-on sequence you can re-trigger, burn-in that accumulates where you dwell, and a degauss ripple on tap.',
    lineage:
      'CRT emulation shaders; terminal aesthetics; the site’s existing step-based grain rather than smooth drift.',
    risk: 'The most costume-prone of the seven. Overdone it reads as a gamer skin rather than a devotional.',
    accent: '#2236a2',
  },
  {
    id: 'hologram',
    name: 'Hologram',
    claim:
      'Presence at a distance — a real thing, rendered as light, that answers when you move.',
    how: 'Plates and the masthead carry a pointer-tracked iridescent foil built from stacked conic and linear gradients in OKLCH, with the glare and the artwork parallaxing against each other. One slow-spinning wireframe mark holds the page.',
    interaction:
      'Tilt the plate with the pointer; the foil tracks the light. Drag the mark to spin it. On touch, a short haptic tick at the tilt limit.',
    lineage:
      'Pointer-driven holographic foil cards (CSS Houdini @property, OKLCH, mask-composite); trading-card foil.',
    risk: 'Iridescence is a rainbow, and this brand is strictly two inks plus crimson. The foil has to be constrained to the palette or it stops being Euangelion.',
    accent: '#c4192e',
  },
  {
    id: 'transmission',
    name: 'Transmission',
    claim:
      'Euangelion means good message. This is the oldest signal, arriving on the newest receiver.',
    how: 'The page arrives rather than appears: noise resolves into type, a lock indicator settles, corner meta reads like a receiver. Loading is tuning. The 7am edition flip is an on-air moment.',
    interaction:
      'A tuning dial you can detune — push it off-frequency and the page degrades into noise; let go and it locks back. The reading is what comes through clean.',
    lineage:
      'The brand’s own etymology; shortwave/broadcast interfaces; the site’s existing 7am edition flip and church-year ident line.',
    risk: 'Fake noise is dishonest. The degradation must be driven by something real (the dial, actual load state) or it is theatre.',
    accent: '#1f2a8d',
  },
  {
    id: 'press',
    name: 'The Press',
    claim:
      'The paper is genuinely machine-made every morning. Show the machine instead of hiding it.',
    how: 'The page composes in front of you: plates register, columns fill, ink density builds to weight, registration marks and crop ticks live in the margins where a real proof carries them.',
    interaction:
      'Re-run the press on demand and scrub the impression frame by frame; pull a registration mark and watch the plate slip out and back.',
    lineage:
      'The site’s own edition engine (this paper really is composed from rows at 7am); press proofs; the masthead intro already shipped.',
    risk: 'Machinery over prayer reads cold. It also invites long animations on the heaviest page on the site.',
    accent: '#1f2a8d',
  },
  {
    id: 'grid',
    name: 'The Grid',
    claim:
      'Finite form is the point. Everything renders through one visible system, and the system is beautiful.',
    how: 'A baseline grid you can actually see, character-cell alignment, monospace meta against the serif reading, numbers that tick rather than change. Motion snaps between cells instead of easing through them.',
    interaction:
      'Toggle the grid on and watch every element snap to it; drag a column rule and the measure recomposes live.',
    lineage:
      'Swiss editorial systems meeting terminal UI; the site’s existing 8px baseline token and Industry/Instrument pairing.',
    risk: 'The least “future” of the seven — it may read timeless rather than forward, which is either the best or the worst thing here.',
    accent: '#11182a',
  },
  {
    id: 'diorama',
    name: 'Diorama',
    claim:
      'The sheet has depth. A printed page is flat; this one is a shallow stage you can look into.',
    how: 'Plate, halftone, type and rules separate onto distinct z-planes and move against each other on scroll and pointer. Inline, a small dimensional scene of the day’s subject sits in the column like a plate that forgot it was flat.',
    interaction:
      'Drag to look around the sheet; scroll drives the parallax. The inline scene can be pushed and settles back.',
    lineage:
      'Awwwards 2026’s scroll-driven camera work, reduced to a shallow stage; the site’s existing ±28px parallax cap.',
    risk: 'Parallax on a reading surface is the classic way to make text feel unstable. Must stay under the site’s own travel cap.',
    accent: '#2236a2',
  },
]

export function getConcept(id: string): FutureConcept | undefined {
  return FUTURES.find((c) => c.id === id)
}

export const SURFACES: { id: SurfaceId; label: string; note: string }[] = [
  {
    id: 'paper',
    label: 'Daily Bread',
    note: 'today’s real edition, rendered by the real EditionPage',
  },
  {
    id: 'devotional',
    label: 'Devotional',
    note: 'a real reading, rendered by the real reader',
  },
]
