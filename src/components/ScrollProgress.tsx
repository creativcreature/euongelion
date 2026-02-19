'use client'

import { useEffect, useState } from 'react'

export default function ScrollProgress({
  showLabel = false,
}: {
  showLabel?: boolean
}) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const scrolled = window.scrollY
      const pct = scrollHeight <= 0 ? 0 : (scrolled / scrollHeight) * 100
      setProgress(Math.min(100, Math.max(0, pct)))
    }

    window.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <>
      <div
        className="scroll-progress"
        style={{
          transform: `scaleX(${progress / 100})`,
          width: '100%',
          opacity: 1,
        }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reading progress"
      />
      {showLabel && (
        <p className="scroll-progress-label text-label">
          {Math.round(progress)}%
        </p>
      )}
    </>
  )
}
