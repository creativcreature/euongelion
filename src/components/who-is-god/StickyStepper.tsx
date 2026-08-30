'use client'

import { useEffect, useRef, useState } from 'react'

export type Step = {
  key: string
  node: React.ReactNode
}

type Props = {
  steps: Step[]
  /** Renders the pinned stage for whichever step is currently active. */
  stage: (activeKey: string, activeIndex: number) => React.ReactNode
  className?: string
  /** Optional label read by screen readers for the pinned region. */
  stageLabel?: string
}

/**
 * Sticky visual + stepper text.
 *
 * This is the pattern the New York Times' "Snow Fall" (2012) established and
 * that Russell Samora's Scrollama — the IntersectionObserver library most
 * newsroom pieces still run on — packaged: ONE graphic is pinned in the
 * viewport while discrete text steps scroll past it, and each step entering a
 * trigger line swaps the graphic's state. Apple ships the same idea on the
 * AirPods Pro page, where its own markup calls the components `scroll-gallery`
 * and `scroll-group` and scroll position decides which frame you are looking at.
 *
 * Scrollama's key detail, reproduced here: the trigger is not "is the step
 * visible" but "has the step crossed a line partway up the viewport". That is
 * what stops two steps being active at once on a fast scroll, and it is done
 * with an asymmetric rootMargin rather than a scroll handler.
 *
 * Accessibility: the steps are ordinary flow content in reading order, so the
 * page is a normal document to a screen reader or with JavaScript off. The
 * pinned stage is decorative reinforcement and is marked aria-hidden unless a
 * label is supplied.
 */
export default function StickyStepper({
  steps,
  stage,
  className,
  stageLabel,
}: Props) {
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const els = stepRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!els.length) return

    // Scrollama's trigger line: a 1px band at 45% down the viewport. A step is
    // active from the moment its box crosses that line until the next one does.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = els.indexOf(e.target as HTMLDivElement)
          if (i >= 0) setActive(i)
        }
      },
      { rootMargin: '-45% 0px -55% 0px', threshold: 0 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [steps.length])

  const activeKey = steps[active]?.key ?? steps[0].key

  return (
    <div className={`wig-stepper ${className ?? ''}`}>
      <div className="wig-stepper-stage-wrap">
        <div
          className="wig-stepper-stage"
          {...(stageLabel
            ? { role: 'img', 'aria-label': stageLabel }
            : { 'aria-hidden': true })}
        >
          {stage(activeKey, active)}
        </div>
      </div>

      <div className="wig-stepper-steps">
        {steps.map((s, i) => (
          <div
            key={s.key}
            ref={(el) => {
              stepRefs.current[i] = el
            }}
            className="wig-step"
            data-active={i === active}
          >
            {s.node}
          </div>
        ))}
      </div>
    </div>
  )
}
