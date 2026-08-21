'use client'

/**
 * LAB — the practices, as real compartments (SA-114 / F-158).
 *
 * Round-two mechanics rendered in the paper's OWN grammar — paper-sheet,
 * paper-box, the real section bars and type — so the founder judges them
 * in literal context. Every one works; persistence uses the same store as
 * the shipped puzzles.
 */
import { useEffect, useRef, useState } from 'react'
import { readPuzzleState, writePuzzleState } from '@/lib/puzzle-store'

const MEM =
  'I have hidden Your word in my heart that I might not sin against You.'
const COPY = 'The LORD is my shepherd; I shall not want.'

function Breathe({
  cycles,
  inWord,
  outWord,
  done,
}: {
  cycles: number
  inWord: string
  outWord: string
  done: string
}) {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'in' | 'out' | 'done'>('in')
  const [left, setLeft] = useState(cycles)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    [],
  )

  const start = () => {
    if (running) return
    setRunning(true)
    setPhase('in')
    let remaining = cycles
    let inhale = true
    timer.current = setInterval(() => {
      inhale = !inhale
      if (inhale) {
        remaining -= 1
        setLeft(remaining)
        if (remaining <= 0) {
          if (timer.current) clearInterval(timer.current)
          setPhase('done')
          setRunning(false)
          return
        }
      }
      setPhase(inhale ? 'in' : 'out')
    }, 4000)
  }

  return (
    <div className="lab-breathe-wrap">
      <button
        type="button"
        onClick={start}
        className={`lab-breathe${phase === 'in' && running ? ' lab-breathe--in' : ''}`}
        aria-label="Begin breathing"
      >
        {phase === 'done'
          ? '✓'
          : running
            ? phase === 'in'
              ? inWord
              : outWord
            : 'TAP'}
      </button>
      <p className="edition-section-note lab-center">
        {phase === 'done'
          ? done
          : running
            ? `${left} to go`
            : `${cycles} cycles · “${inWord}” in · “${outWord}” out`}
      </p>
    </div>
  )
}

export default function LabPractices() {
  // 1 — micro-lectio
  const [stage, setStage] = useState(1)
  const [line, setLine] = useState('')
  const [keptLine, setKeptLine] = useState(
    () => readPuzzleState<string>('euangelion-lab:lectio-line') ?? '',
  )
  // 2 — ladder
  const [rung, setRung] = useState(0)
  // 3 — copywork
  const [copied, setCopied] = useState('')
  // 4 — selah
  const [selah, setSelah] = useState<'idle' | 'going' | 'done'>('idle')
  // 5 — margin
  const [notes, setNotes] = useState<Record<number, string>>(
    () =>
      readPuzzleState<Record<number, string>>('euangelion-lab:margin') ?? {},
  )
  // 6 — examen
  const [life, setLife] = useState('')
  const [drain, setDrain] = useState('')
  // 8 — one act
  const [acted, setActed] = useState(false)

  const ladderText = () => {
    if (rung === 0) return `“${MEM}”`
    if (rung === 1)
      return `“${MEM.split(' ')
        .map((w) => w[0] + '—')
        .join(' ')}”`
    if (rung === 2)
      return `“${MEM.split(' ')
        .map(() => '⎯⎯')
        .join(' ')}”`
    if (rung === 3) return 'say it out loud — then take the last rung to check'
    return `“${MEM}”  ✓`
  }

  const margin = (i: number) => {
    const n = window.prompt('Your margin note (one line):')
    if (!n) return
    const next = { ...notes, [i]: n.slice(0, 60) }
    setNotes(next)
    writePuzzleState('euangelion-lab:margin', next)
  }

  return (
    <div className="paper-sheet lab-sheet">
      {/* 1 · micro-lectio (approved) */}
      <section className="paper-box lab-box" aria-label="Micro-lectio">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">Micro-lectio</h2>
          <p className="edition-section-note">approved · built</p>
        </div>
        <div className="lab-row">
          {(['READ', 'LINGER', 'RESPOND'] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStage(i + 1)}
              className={`lab-btn${stage === i + 1 ? ' lab-btn--on' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        {stage === 1 && (
          <p className="lab-verse">
            “Be still, and know that I am God.”
            <span className="edition-section-note">
              {' '}
              PSALM 46:10 · read it twice, slowly
            </span>
          </p>
        )}
        {stage === 2 && (
          <Breathe
            cycles={3}
            inWord="BE"
            outWord="STILL"
            done="the word held still with you"
          />
        )}
        {stage === 3 && (
          <div>
            <input
              type="text"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="one line back to Him — stays on this device"
              className="lab-input"
              aria-label="Your response"
            />
            <button
              type="button"
              className="lab-btn"
              onClick={() => {
                if (!line.trim()) return
                setKeptLine(line.trim())
                writePuzzleState('euangelion-lab:lectio-line', line.trim())
                setLine('')
              }}
            >
              KEEP
            </button>
            {keptLine && (
              <p className="edition-section-note">
                ✓ kept — tomorrow&apos;s lectio shows it back to you once: “
                {keptLine}”
              </p>
            )}
          </div>
        )}
      </section>

      {/* 2 · ladder */}
      <section
        className="paper-box lab-box"
        aria-label="The memorization ladder"
      >
        <div className="edition-section-bar">
          <h2 className="edition-section-head">The memorization ladder</h2>
          <p className="edition-section-note">
            full → letters → blanks → yours
          </p>
        </div>
        <p className="lab-verse">{ladderText()}</p>
        <button
          type="button"
          className="lab-btn"
          onClick={() => setRung((rung + 1) % 5)}
        >
          TAKE A RUNG AWAY
        </button>
      </section>

      {/* 3 · copywork */}
      <section className="paper-box lab-box" aria-label="Copywork">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">Copywork</h2>
          <p className="edition-section-note">write it out, scribal-slow</p>
        </div>
        <p className="lab-copy-target">{COPY}</p>
        <input
          type="text"
          value={copied}
          onChange={(e) => setCopied(e.target.value)}
          placeholder="copy it, letter by letter"
          className="lab-input"
          aria-label="Copy the verse"
        />
        <p className="lab-copy-out" aria-hidden="true">
          {copied.split('').map((ch, i) => (
            <span key={i} className={ch === COPY[i] ? 'lab-ok' : 'lab-bad'}>
              {ch}
            </span>
          ))}
        </p>
        {copied === COPY && (
          <p className="lab-manuscript">
            — your hand, today. Kept like a manuscript.
          </p>
        )}
      </section>

      {/* 4 · selah */}
      <section
        className={`paper-box lab-box lab-selah${selah === 'going' ? ' lab-selah--going' : ''}`}
        aria-label="Selah"
      >
        <div className="lab-selah-fill" aria-hidden="true" />
        <div className="lab-selah-text">
          <div className="edition-section-bar">
            <h2 className="edition-section-head">Selah — the anti-scroll</h2>
          </div>
          {selah === 'done' ? (
            <p className="lab-verse">
              <i>Selah.</i>{' '}
              <span className="edition-section-note">
                TEN SECONDS. THAT WAS THE WHOLE FEATURE.
              </span>
            </p>
          ) : (
            <>
              <p className="lab-verse">“I wait for the LORD, my soul waits.”</p>
              {selah === 'idle' && (
                <button
                  type="button"
                  className="lab-btn"
                  onClick={() => {
                    setSelah('going')
                    setTimeout(() => setSelah('done'), 10_000)
                  }}
                >
                  HOLD THIS FOR TEN SECONDS
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* 5 · the margin */}
      <section className="paper-box lab-box" aria-label="The margin">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">The margin</h2>
          <p className="edition-section-note">tap a paragraph · your copy</p>
        </div>
        <div className="lab-marginwrap">
          <div>
            {[
              'But the people did not trust the provision. They hoarded. They stockpiled tomorrow’s portion today.',
              'And it rotted — because it was designed to be received daily, and shared freely.',
            ].map((para, i) => (
              <p key={i} className="lab-margin-para" onClick={() => margin(i)}>
                {para}
              </p>
            ))}
          </div>
          <div className="lab-margincol">
            {Object.keys(notes).length === 0 ? (
              <span className="edition-section-note">notes land here</span>
            ) : (
              Object.entries(notes).map(([i, n]) => (
                <div key={i}>
                  ¶{Number(i) + 1} — {n}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6 · examen */}
      <section className="paper-box lab-box" aria-label="The examen">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">The examen</h2>
          <p className="edition-section-note">two taps, evening only</p>
        </div>
        <p className="lab-q">Where did today give life?</p>
        <div className="lab-row">
          {['people', 'work', 'quiet', 'none of it'].map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setLife(o)}
              className={`lab-btn${life === o ? ' lab-btn--on' : ''}`}
            >
              {o}
            </button>
          ))}
        </div>
        <p className="lab-q">Where did it drain?</p>
        <div className="lab-row">
          {['the phone', 'worry', 'conflict', 'hurry'].map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setDrain(o)}
              className={`lab-btn${drain === o ? ' lab-btn--on' : ''}`}
            >
              {o}
            </button>
          ))}
        </div>
        {life && drain && (
          <p className="edition-section-note">
            ✓ kept — tomorrow morning&apos;s paper opens with yesterday,
            privately
          </p>
        )}
      </section>

      {/* 7 · breath prayer */}
      <section className="paper-box lab-box" aria-label="Breath prayer">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">Breath prayer</h2>
          <p className="edition-section-note">four cycles</p>
        </div>
        <Breathe
          cycles={4}
          inWord="LORD JESUS"
          outWord="HAVE MERCY"
          done="amen."
        />
      </section>

      {/* 8 · one act */}
      <section className="paper-box lab-box" aria-label="One act">
        <div className="edition-section-bar">
          <h2 className="edition-section-head">One act</h2>
          <p className="edition-section-note">never tracked · never nagged</p>
        </div>
        <p className="lab-q">
          Today: text the person you have been meaning to thank. One sentence is
          enough.
        </p>
        <button
          type="button"
          className={`lab-btn${acted ? ' lab-btn--on' : ''}`}
          onClick={() => setActed(true)}
        >
          {acted ? 'DONE · ONLY YOU KNOW' : 'I DID IT'}
        </button>
      </section>
    </div>
  )
}
