'use client'

/**
 * MOVE 9 — the word unfolds. The micro-interaction, with haptics.
 *
 * The one place a devotional can be genuinely digital WITHOUT touching the
 * prose: the original-language word. Tap it and it opens IN PLACE — the
 * transliteration types itself, the gloss arrives beneath, and a count of
 * its uses in the passage sits in the margin.
 *
 * This is the "easter egg" register done honestly: nothing is hidden from a
 * reader who wants it, and nothing interrupts a reader who does not. The
 * prose is untouched — the word is already marked up as data.
 */
import { useEffect, useState } from 'react'

interface Lex {
  gk: string
  tr: string
  gloss: string
  uses: number
}

const WORDS: Record<string, Lex> = {
  abide: { gk: 'μένω', tr: 'menō', gloss: 'to remain · to stay put', uses: 11 },
  vine: { gk: 'ἄμπελος', tr: 'ampelos', gloss: 'the vine itself', uses: 3 },
  prunes: {
    gk: 'καθαίρω',
    tr: 'kathairō',
    gloss: 'to cleanse · to cut back',
    uses: 2,
  },
  fruit: { gk: 'καρπός', tr: 'karpos', gloss: 'fruit · yield', uses: 8 },
}

/**
 * The transliteration types itself. Mounted fresh each time a word opens
 * (see the `key` below), so the reveal restarts without an effect ever
 * calling setState in its body.
 */
function Typed({ text }: { text: string }) {
  const [n, setN] = useState(() => {
    if (typeof window === 'undefined') return text.length
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? text.length
      : 0
  })
  useEffect(() => {
    if (n >= text.length) return
    const id = setInterval(() => {
      setN((v) => (v >= text.length ? v : v + 1))
    }, 34)
    return () => clearInterval(id)
    // Runs once per mount; the guard above stops it when the word is done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <span className="lab-typed">
      {text.slice(0, n)}
      {n < text.length && <i className="lab-caret" />}
    </span>
  )
}

export default function WordUnfold() {
  const [open, setOpen] = useState<string | null>(null)

  const mark = (key: string, label: string) => {
    const lex = WORDS[key]
    const isOpen = open === key
    return (
      <span className={`lab-lex ${isOpen ? 'open' : ''}`}>
        <button
          onClick={() => {
            setOpen(isOpen ? null : key)
            if ('vibrate' in navigator) navigator.vibrate?.(isOpen ? 4 : 10)
          }}
        >
          {label}
        </button>
        {isOpen && (
          <span className="lab-lex-card">
            <span className="lab-lex-gk">{lex.gk}</span>
            <span className="lab-lex-tr">
              <Typed key={key} text={lex.tr} />
            </span>
            <span className="lab-lex-gloss">{lex.gloss}</span>
            <span className="lab-lex-uses">{lex.uses}× in this passage</span>
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="lab-demo">
      <div className="lab-prose">
        <p>
          I am the true {mark('vine', 'vine')}, and my Father is the
          vinedresser. Every branch in me that does not bear{' '}
          {mark('fruit', 'fruit')} he takes away, and every branch that does
          bear fruit he {mark('prunes', 'prunes')} it, that it may bear more
          fruit. {mark('abide', 'Abide')} in me, and I in you.
        </p>
      </div>
      <p className="lab-hint">
        <strong>Tap any underlined word.</strong> It opens in place, the
        transliteration types itself, and the margin count tells you how hard
        the passage is leaning on that verb — eleven times for <em>menō</em>,
        which is the entire argument of John 15. On a phone each tap carries a
        short haptic tick. The prose itself is never touched: the word is
        already data in our files.
      </p>
    </div>
  )
}
