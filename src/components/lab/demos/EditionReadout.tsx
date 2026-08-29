'use client'

/**
 * MOVE 6 — the edition readout.
 *
 * Nous pins version and licence strings to the page corners. We have better
 * data than a version number and currently render it as decoration: the
 * edition number, the church-year position, and the real time until the next
 * edition lands at 7am.
 *
 * Second resolution ONLY on the countdown. A page where everything ticks is
 * restless; a page with one true number in the corner is alive.
 */
import { useState, useSyncExternalStore } from 'react'

function nextSeven(now: Date) {
  const n = new Date(now)
  n.setHours(7, 0, 0, 0)
  if (n <= now) n.setDate(n.getDate() + 1)
  return n
}

/**
 * A ticking clock is an EXTERNAL store, not derived state — so it is read
 * with useSyncExternalStore rather than an interval writing into useState.
 * The server snapshot is 0, which renders the skeleton, so server and client
 * markup can never disagree on a second boundary.
 */
function useSecond(): number {
  return useSyncExternalStore(
    (notify) => {
      const id = setInterval(notify, 1000)
      return () => clearInterval(id)
    },
    () => Math.floor(Date.now() / 1000),
    () => 0,
  )
}

export default function EditionReadout() {
  const second = useSecond()
  const [style, setStyle] = useState<'corner' | 'strip'>('corner')

  if (second === 0) return <div className="lab-demo lab-readout-skel" />
  const now = new Date(second * 1000)

  const ms = nextSeven(now).getTime() - now.getTime()
  const hh = String(Math.floor(ms / 3600000)).padStart(2, '0')
  const mm = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  const day = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  )

  return (
    <div className="lab-demo">
      <div className={`lab-readout is-${style}`}>
        <div className="lab-readout-page">
          <span className="lab-readout-word">EUANGELION</span>
          <span className="lab-readout-sub">the paper for this morning</span>
        </div>

        {style === 'corner' ? (
          <>
            <span className="lab-ro tl">
              VOL. 1 · NO. {String(day).padStart(3, '0')}
            </span>
            <span className="lab-ro tr">14W AFTER PENTECOST</span>
            <span className="lab-ro bl">BSB · WEB · KJV · ASV</span>
            <span className="lab-ro br">
              NEXT EDITION{' '}
              <em>
                {hh}:{mm}:{ss}
              </em>
            </span>
          </>
        ) : (
          <div className="lab-ro-strip">
            <span>VOL. 1 · NO. {String(day).padStart(3, '0')}</span>
            <span className="dot">·</span>
            <span>14W AFTER PENTECOST</span>
            <span className="dot">·</span>
            <span>175 READINGS · 32 SERIES</span>
            <span className="dot">·</span>
            <span>
              NEXT EDITION{' '}
              <em>
                {hh}:{mm}:{ss}
              </em>
            </span>
          </div>
        )}
      </div>

      <div className="lab-ctls">
        <button
          className={style === 'corner' ? 'on' : ''}
          onClick={() => setStyle('corner')}
        >
          CORNERS
        </button>
        <button
          className={style === 'strip' ? 'on' : ''}
          onClick={() => setStyle('strip')}
        >
          STRIP
        </button>
      </div>
      <p className="lab-hint">
        <strong>The countdown is live — watch the seconds.</strong> That is a
        real number: time until tomorrow&rsquo;s edition is composed at 7am by
        the engine that already runs. Everything else here holds still on
        purpose.
      </p>
    </div>
  )
}
