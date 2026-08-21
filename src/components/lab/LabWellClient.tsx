'use client'

/** Prints a well sheet when the reader approaches it — the proposed
 *  endless behavior, running on the real page (SA-114 / F-158). */
import { useEffect, useRef, useState } from 'react'

export default function LabWellClient({
  index,
  children,
}: {
  index: number
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [printed, setPrinted] = useState(index === 0)

  useEffect(() => {
    if (printed || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPrinted(true)
          io.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [printed])

  return (
    <div ref={ref} className={printed ? 'lab-printed' : 'lab-waiting'}>
      {printed ? children : <div style={{ minHeight: 240 }} />}
    </div>
  )
}
