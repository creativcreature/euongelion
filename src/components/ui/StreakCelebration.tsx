'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface StreakCelebrationProps {
  milestone: number
  onClose: () => void
}

const milestoneMessages: Record<number, { title: string; message: string; emoji: string }> = {
  7: {
    title: '1 Week Streak!',
    message: 'You\'ve spent a week in God\'s Word. Your faithfulness is bearing fruit!',
    emoji: '🌱',
  },
  14: {
    title: '2 Weeks Strong!',
    message: 'Two weeks of daily devotion. You\'re building a beautiful habit.',
    emoji: '🌿',
  },
  21: {
    title: '3 Week Milestone!',
    message: 'They say 21 days builds a habit. You\'re on your way to transformation!',
    emoji: '🌳',
  },
  30: {
    title: '1 Month Streak!',
    message: 'A full month of faithfulness! Your dedication inspires.',
    emoji: '⭐',
  },
  60: {
    title: '2 Month Achievement!',
    message: 'Two months of daily time with God. You\'re being transformed.',
    emoji: '🌟',
  },
  90: {
    title: '3 Month Milestone!',
    message: 'A quarter year of devotion! Your roots are growing deep.',
    emoji: '💫',
  },
  100: {
    title: '100 Days!',
    message: 'One hundred days of seeking God\'s face. What a testimony!',
    emoji: '🏆',
  },
  180: {
    title: 'Half Year Milestone!',
    message: 'Six months of faithful devotion. You\'re an example to others.',
    emoji: '👑',
  },
  365: {
    title: 'ONE YEAR!',
    message: 'A full year of daily time with God. You are truly devoted!',
    emoji: '🎉',
  },
}

function Confetti() {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    color: string
    delay: number
    duration: number
  }>>([])

  useEffect(() => {
    const colors = ['#c19a6b', '#d4af37', '#f7f3ed', '#ffd700', '#ff6b6b', '#4ecdc4']
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-10px',
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export function StreakCelebration({ milestone, onClose }: StreakCelebrationProps) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 300)
  }, [onClose])

  const content = milestoneMessages[milestone] || {
    title: `${milestone} Day Streak!`,
    message: 'Your faithfulness is an inspiration!',
    emoji: '🔥',
  }

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Confetti */}
      <Confetti />

      {/* Modal */}
      <div
        className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#c19a6b]/30 rounded-2xl p-8 max-w-sm w-full text-center transform transition-all duration-300 ${
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c19a6b]/20 to-transparent" />

        {/* Content */}
        <div className="relative">
          <div className="text-7xl mb-4 animate-bounce-slow">{content.emoji}</div>
          <h2 className="text-2xl font-bold text-[#c19a6b] mb-2">{content.title}</h2>
          <p className="text-gray-300 mb-6">{content.message}</p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl">🔥</span>
            <span className="text-5xl font-bold text-[#f7f3ed]">{milestone}</span>
            <span className="text-lg text-gray-400">days</span>
          </div>

          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-[#c19a6b] to-[#d4af37] text-[#0a0a0a] font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Keep Going!
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook to check if celebration should be shown
const CELEBRATION_KEY = 'euongelion_celebrated_milestones'

export function useCelebration() {
  const [celebratingMilestone, setCelebratingMilestone] = useState<number | null>(null)

  const checkMilestone = useCallback((currentStreak: number) => {
    const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365]

    if (!milestones.includes(currentStreak)) return

    // Check if already celebrated
    try {
      const celebrated = JSON.parse(localStorage.getItem(CELEBRATION_KEY) || '[]')
      if (celebrated.includes(currentStreak)) return

      // Show celebration
      setCelebratingMilestone(currentStreak)

      // Mark as celebrated
      localStorage.setItem(CELEBRATION_KEY, JSON.stringify([...celebrated, currentStreak]))
    } catch (error) {
      console.error('Celebration check failed:', error)
    }
  }, [])

  const dismissCelebration = useCallback(() => {
    setCelebratingMilestone(null)
  }, [])

  return {
    celebratingMilestone,
    checkMilestone,
    dismissCelebration,
  }
}
