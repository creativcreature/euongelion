'use client'

/**
 * MOVE 8 — the Daily Bread as a panelled desk.
 *
 * Nous Portal is a three-panel shell: each pane a real window with its own
 * collapse control. The paper already has genuine compartments — the
 * reading, the prayer, the word, the strip, the puzzles — so presenting it
 * as a workspace turns a scroll into a DESK.
 *
 * The mobile answer is built in and is the reason this is worth trying: at
 * narrow widths the panes stack and the side rails become a row of chips,
 * so the idea degrades into an ordinary page rather than breaking.
 */
import { useState } from 'react'

const PANES = [
  {
    id: 'reading',
    title: 'THE READING',
    meta: 'John 15:1–8',
    body: 'I am the true vine, and my Father is the vinedresser. Every branch in me that does not bear fruit he takes away, and every branch that does bear fruit he prunes, that it may bear more fruit.',
  },
  {
    id: 'prayer',
    title: 'THE PRAYER',
    meta: 'collect · 40 sec',
    body: 'Keep us, O Lord, in the vine. When we are pruned, let us not mistake the knife for abandonment.',
  },
  {
    id: 'word',
    title: 'THE WORD',
    meta: 'μένω · menō',
    body: 'to remain, to abide, to stay put. Used eleven times in this passage — the whole argument is one verb, repeated until it is unavoidable.',
  },
  {
    id: 'strip',
    title: 'THE STRIP',
    meta: 'no. 240',
    body: 'Today’s panel. Three frames, one joke, drawn in the same two inks as everything else.',
  },
]

export default function PanelDesk() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    reading: true,
    prayer: true,
    word: true,
    strip: false,
  })
  const [focus, setFocus] = useState<string | null>(null)
  const [rail, setRail] = useState(true)

  const toggle = (id: string) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
    if ('vibrate' in navigator) navigator.vibrate?.(6)
  }

  return (
    <div className="lab-demo">
      <div className={`lab-desk ${rail ? '' : 'no-rail'}`}>
        {rail && (
          <aside className="lab-desk-rail">
            <span className="lab-desk-railhead">EDITION</span>
            {PANES.map((p, i) => (
              <button
                key={p.id}
                className={open[p.id] ? 'on' : ''}
                onClick={() => toggle(p.id)}
              >
                <span>[{i + 1}]</span> {p.title}
              </button>
            ))}
          </aside>
        )}

        <div className="lab-desk-main">
          {PANES.map((p) => (
            <section
              key={p.id}
              className={`lab-pane ${open[p.id] ? 'open' : 'shut'} ${focus === p.id ? 'focus' : ''}`}
            >
              <header onClick={() => toggle(p.id)}>
                <span className="lab-pane-t">{p.title}</span>
                <span className="lab-pane-m">{p.meta}</span>
                <button
                  className="lab-pane-x"
                  aria-label={open[p.id] ? 'collapse' : 'expand'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(p.id)
                  }}
                >
                  {open[p.id] ? '▾' : '▸'}
                </button>
              </header>
              {/*
                ONE grid child. With two, the second lands in an implicit
                auto-sized row that `grid-template-rows: 0fr` never collapses,
                and a shut pane keeps its full height — which is exactly what
                it did before this wrapper existed.
              */}
              <div className="lab-pane-body">
                <div className="lab-pane-inner">
                  <p>{p.body}</p>
                  <button
                    className="lab-pane-focus"
                    onClick={() => setFocus(focus === p.id ? null : p.id)}
                  >
                    {focus === p.id ? 'release' : 'focus this pane'}
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="lab-ctls">
        <button className={rail ? 'on' : ''} onClick={() => setRail((r) => !r)}>
          {rail ? 'rail on' : 'rail off'}
        </button>
        <button
          onClick={() =>
            setOpen({ reading: true, prayer: true, word: true, strip: true })
          }
        >
          open all
        </button>
        <button
          onClick={() =>
            setOpen({ reading: true, prayer: false, word: false, strip: false })
          }
        >
          reading only
        </button>
      </div>
      <p className="lab-hint">
        <strong>Click any pane header to collapse it</strong>, or drive it from
        the rail. <strong>Focus this pane</strong> dims the rest — that is the
        move that makes a desk better than a scroll. Narrow your window and the
        rail becomes chips, which is the mobile answer.
      </p>
    </div>
  )
}
