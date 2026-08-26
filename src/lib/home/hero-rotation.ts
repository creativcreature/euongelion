/**
 * Homepage hero rotation (SA-113 / F-159, superseding R38's static tomb).
 *
 * Seven gospel plates, the empty tomb first — it is also the CSS fallback for
 * JS-off readers (globals.css gives .homepage-hero-banner-art a
 * var(--hero-rot, url(tomb)) background).
 *
 * The draw runs as a parse-time inline script, and the chosen plate lives on
 * documentElement's style — deliberately OUTSIDE React's reconciliation.
 * page.tsx is a client component behind a year-long edge cache: a render-time
 * pick would freeze one plate into the cached HTML, and any DOM the script
 * builds inside the hydrated tree gets reset on a client re-render (scripts
 * re-inserted via innerHTML never execute — the first implementation shipped
 * a blank banner exactly this way). A CSS custom property survives both.
 *
 * Provenance + the pinned candidate pool: docs/HERO-ROTATION-CANDIDATE-POOL.md.
 */
export const HERO_ROTATION = [
  '/images/site/homepage/hero/header-v2.webp', // the empty tomb — the anchor plate
  '/images/site/homepage/hero/hero-passover.webp', // Exodus 12 — blood on the doorframe
  '/images/site/homepage/hero/hero-furnace.webp', // Daniel 3 — the fourth man in the fire
  '/images/site/homepage/hero/hero-baptism.webp', // Mark 1 — the torn-open sky
  '/images/site/homepage/hero/hero-red-sea.webp', // Exodus 14 — Moses parts the sea
  '/images/site/homepage/hero/hero-vines.webp', // John 15 — the true vine
  '/images/site/homepage/hero/hero-via-dolorosa.webp', // John 19:17 — carrying his cross
] as const

/**
 * Hero widths on disk. Every plate is 2400px wide natively; 960 and 1600
 * derivatives sit beside it as `<base>-960.webp` / `<base>-1600.webp`.
 *
 * WHY: the banner paints via CSS `background-image`, which gets none of the
 * responsive negotiation an `<img srcset>` would. A phone was pulling the full
 * 2400px plate — 381-618 KB for a decorative band ~103px tall, and it is the
 * LCP element. The 960 derivative is 70-128 KB, about 81% smaller, and is still
 * 2x the widest phone the banner renders on.
 */
export const HERO_WIDTHS = [960, 1600, 2400] as const

/** `/…/hero-vines.webp` + 960 → `/…/hero-vines-960.webp` (2400 is the base). */
export function heroVariant(src: string, width: number): string {
  return width >= 2400 ? src : src.replace(/\.webp$/, `-${width}.webp`)
}

/**
 * The inline draw script: picks one plate, publishes it at all three widths as
 * CSS custom properties, and preloads ONLY the width this viewport will paint.
 *
 * Three properties rather than one because a CSS background cannot choose by
 * viewport on its own — globals.css switches between them at the same
 * breakpoints used here. The preload has to agree with that choice or the
 * browser fetches a plate the page never paints, which is worse than no
 * preload at all: it spends the LCP budget twice.
 */
export function heroDrawScript(sources: readonly string[]): string {
  return (
    '(function(){' +
    `var h=${JSON.stringify(sources)};` +
    'var s=h[Math.floor(Math.random()*h.length)];' +
    "var v=function(w){return w>=2400?s:s.replace(/\\.webp$/,'-'+w+'.webp')};" +
    'var d=document.documentElement;' +
    "d.style.setProperty('--hero-rot-sm','url('+v(960)+')');" +
    "d.style.setProperty('--hero-rot-md','url('+v(1600)+')');" +
    "d.style.setProperty('--hero-rot','url('+v(2400)+')');" +
    // Match the CSS breakpoints below. Uses the DPR-aware CSS width the
    // banner is actually laid out at, not the device pixel count.
    'var w=window.innerWidth||960;' +
    'var pick=w>=1100?v(2400):(w>=600?v(1600):v(960));' +
    "var l=document.createElement('link');" +
    "l.setAttribute('rel','preload');" +
    "l.setAttribute('as','image');" +
    "l.setAttribute('href',pick);" +
    "l.setAttribute('fetchpriority','high');" +
    'document.head.appendChild(l);' +
    '})()'
  )
}
