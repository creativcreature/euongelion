/**
 * Is this title machine-derived rather than written?
 *
 * `site-devotional-art.ts` is generated, and 350 of its entries carry a title
 * that is the source filename title-cased — "Sym Doorway Arched Linocut",
 * "Obj Lamp Clay", "Brand Mark Rule". Interpolated into `alt` those announce as
 * "Sym Doorway Arched Linocut by Christopher James Parker + AI, image", which is
 * a filename read aloud, not a description (backlog #60).
 *
 * Where the title is machine-derived the visible <figcaption> beside the image
 * already carries the title and the credit, so the image itself is decorative
 * in the accessibility sense and takes `alt=""` — the caption is the accessible
 * text, and a screen reader hears it once instead of twice. Hand-written titles
 * (the Rembrandts, Vermeers and the rest) keep their descriptive alt.
 */
export function isMachineTitle(title: string): boolean {
  return /^(Sym|Obj|Brand|Element)\b/i.test(title.trim())
}

/** Alt text for an artwork image that sits beside a visible caption. */
export function artworkAlt(title: string, artist: string): string {
  return isMachineTitle(title) ? '' : `${title} by ${artist}`
}

/** Accessible name for the control that opens the artwork in the gallery. */
export function artworkOpenLabel(title: string): string {
  return isMachineTitle(title)
    ? 'View artwork in gallery'
    : `View "${title}" in gallery`
}
