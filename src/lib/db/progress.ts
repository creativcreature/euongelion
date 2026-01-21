'use client'

import { supabase } from '@/lib/supabase'

export interface ProgressRecord {
  id: string
  user_id: string
  series_slug: string
  day: number
  completed_at: string
}

const LOCAL_PROGRESS_KEY = 'euongelion_progress'

function getLocalProgress(): Record<string, number[]> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLocalProgress(progress: Record<string, number[]>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress))
}

export async function markAsRead(seriesSlug: string, day: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Store locally for anonymous users
      const local = getLocalProgress()
      if (!local[seriesSlug]) local[seriesSlug] = []
      if (!local[seriesSlug].includes(day)) {
        local[seriesSlug].push(day)
        saveLocalProgress(local)
      }
      return true
    }

    const { error } = await supabase
      .from('progress')
      .upsert({
        user_id: user.id,
        series_slug: seriesSlug,
        day,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,series_slug,day'
      })

    if (error) {
      console.error('Failed to mark as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to mark as read:', error)
    return false
  }
}

export async function isRead(seriesSlug: string, day: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalProgress()
      return local[seriesSlug]?.includes(day) || false
    }

    const { data, error } = await supabase
      .from('progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('series_slug', seriesSlug)
      .eq('day', day)
      .single()

    if (error || !data) return false
    return true
  } catch {
    return false
  }
}

export async function getSeriesProgress(seriesSlug: string): Promise<number[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalProgress()
      return local[seriesSlug] || []
    }

    const { data, error } = await supabase
      .from('progress')
      .select('day')
      .eq('user_id', user.id)
      .eq('series_slug', seriesSlug)

    if (error || !data) return []
    return data.map((r) => r.day)
  } catch {
    return []
  }
}

export async function getAllProgress(): Promise<Record<string, number[]>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return getLocalProgress()
    }

    const { data, error } = await supabase
      .from('progress')
      .select('series_slug, day')
      .eq('user_id', user.id)

    if (error || !data) return {}

    const progress: Record<string, number[]> = {}
    for (const record of data) {
      if (!progress[record.series_slug]) progress[record.series_slug] = []
      progress[record.series_slug].push(record.day)
    }
    return progress
  } catch {
    return {}
  }
}

export async function getReadCount(): Promise<number> {
  const progress = await getAllProgress()
  return Object.values(progress).reduce((sum, days) => sum + days.length, 0)
}
