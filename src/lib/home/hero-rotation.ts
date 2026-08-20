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
  '/images/site/homepage/hero/hero-finished.webp', // John 19:30 — it is finished
  '/images/site/homepage/hero/hero-vines.webp', // John 15 — the true vine
  '/images/site/homepage/hero/hero-via-dolorosa.webp', // John 19:17 — carrying his cross
] as const

/**
 * The inline draw script: picks one plate, sets --hero-rot on <html>, and
 * appends a fetchpriority=high image preload so the banner keeps its LCP
 * priority (the old next/image `priority` contract).
 */
export function heroDrawScript(sources: readonly string[]): string {
  return (
    '(function(){' +
    `var h=${JSON.stringify(sources)};` +
    'var s=h[Math.floor(Math.random()*h.length)];' +
    "document.documentElement.style.setProperty('--hero-rot','url('+s+')');" +
    "var l=document.createElement('link');" +
    "l.setAttribute('rel','preload');" +
    "l.setAttribute('as','image');" +
    "l.setAttribute('href',s);" +
    "l.setAttribute('fetchpriority','high');" +
    'document.head.appendChild(l);' +
    '})()'
  )
}
