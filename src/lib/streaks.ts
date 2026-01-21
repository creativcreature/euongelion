'use client'

const STREAKS_KEY = 'euongelion_streaks'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastReadDate: string | null
  totalDaysRead: number
  startDate: string | null
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getYesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

function loadStreakData(): StreakData {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      totalDaysRead: 0,
      startDate: null,
    }
  }

  try {
    const stored = localStorage.getItem(STREAKS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load streak data:', error)
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    totalDaysRead: 0,
    startDate: null,
  }
}

function saveStreakData(data: StreakData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STREAKS_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save streak data:', error)
  }
}

export function getStreaks(): StreakData {
  const data = loadStreakData()
  const today = getToday()
  const yesterday = getYesterday()

  // Check if streak should be reset (missed more than one day)
  if (data.lastReadDate && data.lastReadDate !== today && data.lastReadDate !== yesterday) {
    data.currentStreak = 0
  }

  return data
}

export function recordReading(): StreakData {
  const data = loadStreakData()
  const today = getToday()
  const yesterday = getYesterday()

  // Already read today
  if (data.lastReadDate === today) {
    return data
  }

  // Streak continues from yesterday
  if (data.lastReadDate === yesterday) {
    data.currentStreak += 1
  } else if (data.lastReadDate === null || data.lastReadDate !== today) {
    // Starting fresh (first read or streak broken)
    data.currentStreak = 1
    if (!data.startDate) {
      data.startDate = today
    }
  }

  data.lastReadDate = today
  data.totalDaysRead += 1

  // Update longest streak
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak
  }

  saveStreakData(data)
  return data
}

export function resetStreaks(): void {
  const freshData: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    totalDaysRead: 0,
    startDate: null,
  }
  saveStreakData(freshData)
}

export function getStreakMilestone(streak: number): { reached: boolean; milestone: number } | null {
  const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365]

  for (const milestone of milestones) {
    if (streak === milestone) {
      return { reached: true, milestone }
    }
  }

  // Find next milestone
  for (const milestone of milestones) {
    if (streak < milestone) {
      return { reached: false, milestone }
    }
  }

  return null
}

export function formatStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!'
  if (streak === 1) return '1 day streak - great start!'
  if (streak < 7) return `${streak} day streak - keep going!`
  if (streak === 7) return '1 week streak!'
  if (streak < 14) return `${streak} day streak - on fire!`
  if (streak === 14) return '2 week streak!'
  if (streak < 21) return `${streak} day streak - incredible!`
  if (streak === 21) return '3 week streak!'
  if (streak < 30) return `${streak} day streak - unstoppable!`
  if (streak === 30) return '1 month streak!'
  if (streak < 60) return `${streak} day streak - amazing dedication!`
  if (streak === 60) return '2 month streak!'
  if (streak < 90) return `${streak} day streak - truly devoted!`
  if (streak === 90) return '3 month streak!'
  if (streak === 100) return '100 day streak!'
  if (streak < 180) return `${streak} day streak - remarkable!`
  if (streak === 180) return '6 month streak!'
  if (streak < 365) return `${streak} day streak - extraordinary!`
  if (streak === 365) return '1 year streak!'
  return `${streak} day streak - legendary!`
}
