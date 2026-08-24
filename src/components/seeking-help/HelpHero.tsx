/**
 * Hero mark for /seeking-help-georgia.
 *
 * Hand-authored SVG rather than a raster for three reasons that all point the
 * same way: it weighs about 3KB instead of 300KB (this page's readers are the
 * most likely on the site to be on a weak connection or a metered plan), it
 * inherits the light/dark tokens instead of shipping two files, and it stays
 * crisp when the PDF renderer prints it at 300dpi.
 *
 * Subject is an open door with light on the threshold. No people — a page
 * about people in trouble should not decorate itself with pictures of people
 * in trouble.
 */

export default function HelpHero() {
  return (
    <svg
      className="gahelp-hero-svg"
      viewBox="0 0 1600 420"
      role="img"
      aria-label="An open door with light falling across the threshold"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Halftone grain — the risograph tell. */}
        <pattern
          id="gahelp-grain"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="0.62" fill="currentColor" opacity="0.16" />
        </pattern>

        {/* The light itself, falling right across the floor. */}
        <linearGradient id="gahelp-light" x1="0" y1="0" x2="1" y2="0.35">
          <stop
            offset="0%"
            stopColor="var(--gahelp-hero-gold)"
            stopOpacity="0.92"
          />
          <stop
            offset="55%"
            stopColor="var(--gahelp-hero-gold)"
            stopOpacity="0.42"
          />
          <stop
            offset="100%"
            stopColor="var(--gahelp-hero-gold)"
            stopOpacity="0"
          />
        </linearGradient>

        <linearGradient id="gahelp-doorglow" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--gahelp-hero-gold)"
            stopOpacity="0.95"
          />
          <stop
            offset="100%"
            stopColor="var(--gahelp-hero-gold)"
            stopOpacity="0.55"
          />
        </linearGradient>
      </defs>

      {/* Ground */}
      <rect width="1600" height="420" fill="var(--gahelp-hero-bg)" />

      {/* The spill of light across the floor — the whole point of the image */}
      <path
        d="M470 196 L1560 300 L1560 420 L392 420 Z"
        fill="url(#gahelp-light)"
      />

      {/* Floorline */}
      <path
        d="M0 316 L1600 316"
        stroke="var(--gahelp-hero-ink)"
        strokeWidth="2.5"
        opacity="0.35"
      />

      {/* Door frame */}
      <rect
        x="300"
        y="52"
        width="196"
        height="264"
        fill="none"
        stroke="var(--gahelp-hero-ink)"
        strokeWidth="5"
      />

      {/* The opening — light coming through */}
      <rect
        x="326"
        y="76"
        width="146"
        height="240"
        fill="url(#gahelp-doorglow)"
      />

      {/* The door itself, swung open to the left */}
      <path
        d="M300 52 L188 92 L188 356 L300 316 Z"
        fill="var(--gahelp-hero-ink)"
        opacity="0.9"
      />
      <path
        d="M300 52 L188 92 L188 356 L300 316 Z"
        fill="none"
        stroke="var(--gahelp-hero-ink)"
        strokeWidth="4"
      />
      {/* Handle */}
      <circle cx="222" cy="222" r="7" fill="var(--gahelp-hero-gold)" />

      {/* A chair just inside — someone kept a seat */}
      <g
        stroke="var(--gahelp-hero-ink)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.82"
      >
        <path d="M628 214 L628 300" />
        <path d="M700 214 L700 300" />
        <path d="M620 252 L708 252" />
        <path d="M624 214 L704 214" />
        <path d="M628 252 L628 214" />
      </g>

      {/* Distant window — a second light, further in */}
      <g opacity="0.5">
        <rect
          x="1128"
          y="120"
          width="140"
          height="112"
          fill="none"
          stroke="var(--gahelp-hero-ink)"
          strokeWidth="4"
        />
        <path
          d="M1198 120 L1198 232 M1128 176 L1268 176"
          stroke="var(--gahelp-hero-ink)"
          strokeWidth="3"
        />
      </g>

      {/* Grain over everything, misregistered a hair like a real riso pull */}
      <rect
        width="1600"
        height="420"
        fill="url(#gahelp-grain)"
        color="var(--gahelp-hero-ink)"
        transform="translate(1.5, 1)"
      />
    </svg>
  )
}
