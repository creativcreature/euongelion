'use client'

import { supabase } from '@/lib/supabase'

export interface Note {
  id: string
  user_id: string
  series_slug: string
  day: number
  content: string
  highlight_text?: string
  created_at: string
  updated_at: string
}

const LOCAL_NOTES_KEY = 'euongelion_notes'

interface LocalNote {
  id: string
  series_slug: string
  day: number
  content: string
  highlight_text?: string
  created_at: string
  updated_at: string
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getLocalNotes(): LocalNote[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(LOCAL_NOTES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveLocalNotes(notes: LocalNote[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes))
}

export async function addNote(
  seriesSlug: string,
  day: number,
  content: string,
  highlightText?: string
): Promise<LocalNote | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    if (!user) {
      const local = getLocalNotes()
      const newNote: LocalNote = {
        id: generateId(),
        series_slug: seriesSlug,
        day,
        content,
        highlight_text: highlightText,
        created_at: now,
        updated_at: now,
      }
      local.push(newNote)
      saveLocalNotes(local)
      return newNote
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        series_slug: seriesSlug,
        day,
        content,
        highlight_text: highlightText,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to add note:', error)
      return null
    }

    return data as LocalNote
  } catch (error) {
    console.error('Failed to add note:', error)
    return null
  }
}

export async function updateNote(noteId: string, content: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const now = new Date().toISOString()

    if (!user) {
      const local = getLocalNotes()
      const index = local.findIndex((n) => n.id === noteId)
      if (index !== -1) {
        local[index].content = content
        local[index].updated_at = now
        saveLocalNotes(local)
        return true
      }
      return false
    }

    const { error } = await supabase
      .from('notes')
      .update({ content, updated_at: now })
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to update note:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to update note:', error)
    return false
  }
}

export async function deleteNote(noteId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalNotes()
      const filtered = local.filter((n) => n.id !== noteId)
      saveLocalNotes(filtered)
      return true
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete note:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to delete note:', error)
    return false
  }
}

export async function getNotesForDevotional(seriesSlug: string, day: number): Promise<LocalNote[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const local = getLocalNotes()
      return local.filter((n) => n.series_slug === seriesSlug && n.day === day)
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('series_slug', seriesSlug)
      .eq('day', day)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as LocalNote[]
  } catch {
    return []
  }
}

export async function getAllNotes(): Promise<LocalNote[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return getLocalNotes()
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as LocalNote[]
  } catch {
    return []
  }
}
