'use client'

import { supabase } from '@/lib/supabase'

export interface Bookmark {
  id: string
  user_id: string
  series_slug: string
  day: number
  created_at: string
}

const LOCAL_BOOKMARKS_KEY = 'euongelion_bookmarks'

interface LocalBookmark {
  series_slug: string
  day: number
  created_at: string
}

function getLocalBookmarks(): LocalBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_BOOKMARKS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLocalBookmarks(bookmarks: LocalBookmark[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(bookmarks))
}

export async function addBookmark(seriesSlug: string, day: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalBookmarks()
      const exists = local.some((b) => b.series_slug === seriesSlug && b.day === day)
      if (!exists) {
        local.push({ series_slug: seriesSlug, day, created_at: new Date().toISOString() })
        saveLocalBookmarks(local)
      }
      return true
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        series_slug: seriesSlug,
        day,
      })

    if (error) {
      console.error('Failed to add bookmark:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to add bookmark:', error)
    return false
  }
}

export async function removeBookmark(seriesSlug: string, day: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalBookmarks()
      const filtered = local.filter((b) => !(b.series_slug === seriesSlug && b.day === day))
      saveLocalBookmarks(filtered)
      return true
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('series_slug', seriesSlug)
      .eq('day', day)

    if (error) {
      console.error('Failed to remove bookmark:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to remove bookmark:', error)
    return false
  }
}

export async function isBookmarked(seriesSlug: string, day: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalBookmarks()
      return local.some((b) => b.series_slug === seriesSlug && b.day === day)
    }

    const { data, error } = await supabase
      .from('bookmarks')
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

export async function toggleBookmark(seriesSlug: string, day: number): Promise<boolean> {
  const bookmarked = await isBookmarked(seriesSlug, day)
  if (bookmarked) {
    await removeBookmark(seriesSlug, day)
    return false
  } else {
    await addBookmark(seriesSlug, day)
    return true
  }
}

export async function getAllBookmarks(): Promise<LocalBookmark[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return getLocalBookmarks()
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('series_slug, day, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as LocalBookmark[]
  } catch {
    return []
  }
}
