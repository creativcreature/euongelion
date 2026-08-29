/**
 * THE PROOF — the nine moves, as data.
 *
 * Each move's `slug` is also its key in the pitch archive, so a verdict left
 * on the lab page and a verdict left at /admin/pitches are the same record.
 *
 * `look` is the most important field on here. The founder's repeated note is
 * that describing a visual does nothing — so every entry says exactly which
 * control to touch and what should happen when you do.
 */
export interface Move {
  slug: string
  short: string
  title: string
  what: string
  look: string
  effort: string
  risk: string
}

export const MOVES: Move[] = [
  {
    slug: 'move-living-plate',
    short: 'living halftone',
    title: 'The living halftone — the animated imagery treatment',
    what: 'The plate is redrawn as a coarse dot field in the two brand inks, generated from the real artwork at runtime, and the field is ALIVE — it prints itself on arrival, swells, or takes a press roller down its face. This is the Nous treatment: their hero is a looping video of a dithered figure, not a still image.',
    look: 'Hit RESOLVE then ↻ replay — the plate prints itself rather than fading in. Switch to BREATHE and watch density move without anything changing position. Pull the dot slider from 4px to 20px: photography becomes print. Then hit "compare to source" — that is the untouched plate, and the proof this is generated live rather than a supplied asset.',
    effort:
      'Medium — one canvas component; works on all 175 devotionals with no new assets.',
    risk: 'Low. Runs once on load, settles, and stops. Respects reduced-motion by drawing a single settled frame.',
  },
  {
    slug: 'move-diagram-plate',
    short: 'plate as diagram',
    title: 'The plate becomes a diagram',
    what: 'Anchored callouts tethered to points in the artwork by hairline leaders, staggering in on load. The plate stops being decoration and becomes a reading of the reading.',
    look: 'Toggle PLATE / DIAGRAM to see what the artwork looks like with and without it. Hover or tap a callout — the leader and its anchor point light together, so the label and the thing it names are unmistakably linked.',
    effort:
      'Medium — four coordinates and four labels authored per plate, alongside the devotional.',
    risk: 'Labels must never cover the subject. Mobile needs numbered hotspots that expand on tap.',
  },
  {
    slug: 'move-radiant-geometry',
    short: 'radiant hairlines',
    title: 'Radiating hairline geometry',
    what: 'Thin rays drawn from behind the plate on entry. Not decoration on a devotional: radiance behind the subject is the oldest visual language the church has, drawn here by a machine.',
    look: 'Hit ↻ draw again and watch the rays stroke on in a stagger from the centre — they are drawn, not faded. Push the ray count to 64 and it becomes a machine halo; drop to 8 and it becomes a compass.',
    effort: 'Low — pure SVG, no assets.',
    risk: 'Low, while the strokes stay hairline. Any thicker and it is a sunburst graphic. No bloom — the brand refuses glow.',
  },
  {
    slug: 'move-ghost-wordmark',
    short: 'ghosted wordmark',
    title: 'The ghosted wordmark, with parallax',
    what: 'EUANGELION at enormous scale, ghosted, sitting behind the day’s plate — with the two planes moving against each other so it reads as depth rather than as a watermark.',
    look: 'Move the pointer across the plate: the wordmark and the plate travel in OPPOSITE directions. Now pull depth to 0 — it collapses into a flat watermark, which is exactly what this looks like when it is done badly.',
    effort: 'Very low — we already own the wordmark and the plate.',
    risk: 'Very low. Travel is capped at the site’s own ±28px parallax limit.',
  },
  {
    slug: 'move-leader-index',
    short: 'leader index',
    title: 'Dotted leaders and bracketed indices',
    what: 'The contents row stops being a menu and becomes an index. Press the number and go — the paper becomes keyboard-addressable without introducing a command line.',
    look: 'Click into the block and press 1–6. The row fires and reports which key you hit. The dot leaders are generated, so they fill whatever gap is left at any window width — narrow the window and they re-fill rather than wrap.',
    effort: 'Low.',
    risk: 'Low. The most certain win on the list.',
  },
  {
    slug: 'move-edition-readout',
    short: 'edition readout',
    title: 'The edition readout',
    what: 'Real data pinned to the page corners: the edition number, the church-year position, and the live time until tomorrow’s paper is composed at 7am.',
    look: 'Watch the seconds on NEXT EDITION — that is a true countdown to the real 7am edition run, not a decoration. Switch CORNERS to STRIP for the alternative placement. Everything else deliberately holds still: one moving number, not a restless page.',
    effort:
      'Low — the data already exists and is currently rendered as ornament.',
    risk: 'A page that ticks can feel restless. Second-resolution on the countdown only.',
  },
  {
    slug: 'move-panel-desk',
    short: 'panelled desk',
    title: 'The Daily Bread as a panelled desk',
    what: 'The paper’s real compartments — reading, prayer, word, strip — presented as collapsible panes with a rail, the way Nous Portal presents a workspace. A scroll becomes a desk.',
    look: 'Collapse a pane from its header or from the rail. Then hit "focus this pane" — the others dim, which is the move that makes a desk better than a scroll. Narrow your browser window: the rail becomes chips and the panes stack, which is the mobile answer built in.',
    effort: 'High — real layout work on the heaviest page on the site.',
    risk: 'High on mobile. The stacking fallback here is the argument that it is survivable, but this is the one that could still end up desktop-only.',
  },
  {
    slug: 'move-word-unfold',
    short: 'the word unfolds',
    title: 'The word unfolds — micro-interaction with haptics',
    what: 'The original-language word opens in place: the transliteration types itself, the gloss arrives, and the margin says how many times the passage uses it. The one place a devotional can be genuinely digital without touching the prose.',
    look: 'Tap any underlined word in the passage. Watch "menō" type itself, and note the margin count — eleven times in John 15, which IS the argument of the chapter. On a phone each tap carries a short haptic tick. Nothing is hidden from a reader who wants it and nothing interrupts a reader who does not.',
    effort: 'Low-medium — the words are already data in our devotional files.',
    risk: 'Low. Degrades to plain text with no JS.',
  },
  {
    slug: 'move-cross-pile',
    short: 'the physics pile',
    title: 'The physics pile — the big swing',
    what: 'A real-time pile of cross-shaped solids in the brand’s inks that you shove with the pointer and which resettle under gravity. A hero with STATE: you change it and it stays changed.',
    look: 'Move the pointer through the pile and shove it — the momentum propagates, so pushing one cross moves the ones behind it. Set gravity to 0 and they drift in the void. Hit ↻ drop again to rain them back in.',
    effort:
      'Medium here, because it is hand-rolled — no physics engine, no WebGL, roughly 200 lines and zero new dependencies.',
    risk: 'Highest on the list, and not a technical one: a pile of crosses you can knock over is either magnificent or irreverent. That is a founder call, not a design one.',
  },
]
