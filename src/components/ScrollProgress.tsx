'use client'

import { useEffect, useState, useRef } from 'react'

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const pct = (scrolled / scrollHeight) * 100
      setProgress(Math.min(100, Math.max(0, pct)))
      setVisible(true)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(false), 2000)
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => {
      window.removeEventListener('scroll', updateProgress)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      className="scroll-progress"
      style={{
        transform: `scaleX(${progress / 100})`,
        width: '100%',
        opacity: visible ? 1 : 0,
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    />
  )
}
