'use client'

import { useReveal } from './useReveal'

type Props = {
  id: string
  /** 01..07 — rendered monospace, Nous-style numeric readout. */
  n: string
  kicker: string
  title: string
  /** Where this room sits on the light spine, 0 (the deep) → 1 (full light). */
  light: number
  /** Full-bleed plate behind the room. */
  plate?: string
  /** Marks Room 05 — the one place the spine falls instead of rising. */
  dip?: boolean
  children: React.ReactNode
}

/**
 * One room.
 *
 * Structure borrowed from Cartier Watches & Wonders 2026 (Immersive Garden,
 * Awwwards SOTD): six self-contained alcoves — "intimate, protective spaces
 * inviting visitors into moments of wonder" — that you scroll through like rooms
 * in a museum, where "scroll moves you between rooms, not just down a page". We
 * take the idea and build it in riso plates and type rather than WebGL, because
 * their grammar sells an object and ours introduces a person, and because a
 * 500KB Three.js payload excludes the reader this page exists for.
 *
 * Separation between rooms is WHITESPACE AND LIGHT, never a rule. That is the
 * Nous portal pattern the founder pointed at twice — sections divided by space
 * rather than borders — and removing the border-top that sat above every chapter
 * head is the single biggest step away from reading like a blog.
 */
export default function Room({
  id,
  n,
  kicker,
  title,
  light,
  plate,
  dip,
  children,
}: Props) {
  const ref = useReveal<HTMLElement>(0.05)
  return (
    <section
      ref={ref}
      className="wig-room"
      id={id}
      data-in="false"
      data-light={light}
      data-dip={dip ? 'true' : undefined}
      aria-labelledby={`${id}-title`}
    >
      {plate ? (
        <div className="wig-room-plate" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plate} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}

      <div className="wig-room-inner">
        <header className="wig-room-head">
          <p className="wig-room-n">{n}</p>
          <p className="wig-room-kicker">{kicker}</p>
          <h2 id={`${id}-title`} className="wig-room-title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}
