'use client'

/**
 * The Coloring Corner (SA-114 / F-158) — the daily mini art game.
 *
 * Founder: "a color by the number kinda thing, where they can fill in
 * premade art either using a crayon scribble or a color dropper."
 *
 * Premade line art (src/data/coloring-bank.ts) with numbered regions.
 * Tap a crayon, tap a region: it fills with a crayon-scribble (an SVG
 * pattern of rough diagonal strokes in that color). The DROPPER picks a
 * color back up from any filled region. Numbers are suggestions, exactly
 * like the cards — nobody is graded. Progress persists per artwork
 * (localStorage, same store as the puzzles).
 */
import { useState } from 'react'
import type { ColoringArt } from '@/data/coloring-bank'
import { readPuzzleState, writePuzzleState } from '@/lib/puzzle-store'

/** The crayon box: the site's inks first, then a small honest range. */
const CRAYONS = [
  '#1f2a8d', // 1 cobalt
  '#c4192e', // 2 crimson
  '#d9a441', // 3 gold
  '#2e6b4f', // 4 green
  '#7a4f2a', // 5 brown
  '#7c9ec9', // 6 sky
  '#efe3c8', // 7 cream
  '#10152b', // 8 ink
]

export default function ColoringClient({ art }: { art: ColoringArt }) {
  const storeKey = `euangelion-puzzle:color:${art.id}`
  const [fills, setFills] = useState<Record<string, number>>(
    () => readPuzzleState<Record<string, number>>(storeKey) ?? {},
  )
  const [crayon, setCrayon] = useState(1)
  const [dropper, setDropper] = useState(false)

  const paint = (index: number) => {
    if (dropper) {
      const existing = fills[index]
      if (existing) {
        setCrayon(existing)
      }
      setDropper(false)
      return
    }
    setFills((prev) => {
      const next = { ...prev, [index]: crayon }
      writePuzzleState(storeKey, next)
      return next
    })
  }

  return (
    <div className="puzzle-coloring">
      <div
        className="puzzle-coloring-crayons"
        role="toolbar"
        aria-label="Crayons"
      >
        {CRAYONS.map((hex, i) => (
          <button
            key={hex}
            type="button"
            aria-label={`Crayon ${i + 1}`}
            aria-pressed={!dropper && crayon === i + 1}
            className={`puzzle-coloring-crayon${!dropper && crayon === i + 1 ? ' puzzle-coloring-crayon--held' : ''}`}
            style={{ backgroundColor: hex }}
            onClick={() => {
              setCrayon(i + 1)
              setDropper(false)
            }}
          >
            <span className="puzzle-coloring-crayon-n">{i + 1}</span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Dropper"
          aria-pressed={dropper}
          className={`puzzle-coloring-dropper${dropper ? ' puzzle-coloring-crayon--held' : ''}`}
          onClick={() => setDropper((v) => !v)}
        >
          ⊙
        </button>
      </div>

      <svg
        viewBox={art.viewBox}
        className="puzzle-coloring-canvas"
        role="img"
        aria-label={`${art.title} — a coloring picture`}
      >
        <defs>
          {CRAYONS.map((hex, i) => (
            <pattern
              key={hex}
              id={`crayon-${art.id}-${i + 1}`}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-24)"
            >
              <rect width="7" height="7" fill={hex} opacity="0.32" />
              <path
                d="M0 3.5 H7"
                stroke={hex}
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M0 6.8 H7"
                stroke={hex}
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.5"
              />
            </pattern>
          ))}
        </defs>
        {art.regions.map((r, i) => (
          <path
            key={i}
            d={r.d}
            data-region={i}
            fill={fills[i] ? `url(#crayon-${art.id}-${fills[i]})` : 'none'}
            stroke="var(--mock-ink, #10152b)"
            strokeWidth="1.6"
            onClick={() => paint(i)}
            style={{ cursor: 'pointer' }}
          >
            <title>{r.label}</title>
          </path>
        ))}
        {art.outlines.map((d, i) => (
          <path
            key={`o${i}`}
            d={d}
            fill="none"
            stroke="var(--mock-ink, #10152b)"
            strokeWidth="2.2"
            pointerEvents="none"
          />
        ))}
        {art.regions.map((r, i) =>
          fills[i] ? null : (
            <text
              key={`n${i}`}
              x={r.nx}
              y={r.ny}
              className="puzzle-coloring-number"
              pointerEvents="none"
            >
              {r.n}
            </text>
          ),
        )}
      </svg>
      <p className="puzzle-coloring-caption">{art.caption}</p>
    </div>
  )
}
