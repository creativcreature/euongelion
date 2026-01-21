'use client'

import { useState, useEffect } from 'react'
import { getNotesForDevotional, addNote, deleteNote, updateNote } from '@/lib/db/notes'

interface Note {
  id: string
  content: string
  highlight_text?: string
  created_at: string
  updated_at: string
}

interface NotesSectionProps {
  seriesSlug: string
  day: number
  className?: string
}

export function NotesSection({ seriesSlug, day, className = '' }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadNotes()
  }, [seriesSlug, day])

  async function loadNotes() {
    const result = await getNotesForDevotional(seriesSlug, day)
    setNotes(result)
    setLoading(false)
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    setSaving(true)
    const note = await addNote(seriesSlug, day, newNote.trim())
    if (note) {
      setNotes([note, ...notes])
      setNewNote('')
    }
    setSaving(false)
  }

  async function handleDeleteNote(noteId: string) {
    const success = await deleteNote(noteId)
    if (success) {
      setNotes(notes.filter((n) => n.id !== noteId))
    }
  }

  async function handleUpdateNote(noteId: string) {
    if (!editContent.trim()) return
    const success = await updateNote(noteId, editContent.trim())
    if (success) {
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, content: editContent.trim() } : n)))
      setEditingId(null)
      setEditContent('')
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-[#f7f3ed] mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        My Notes
      </h3>

      {/* Add new note */}
      <div className="mb-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note or reflection..."
          className="w-full p-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-[#f7f3ed] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c19a6b] focus:border-transparent resize-none"
          rows={3}
        />
        <button
          onClick={handleAddNote}
          disabled={!newNote.trim() || saving}
          className="mt-2 px-4 py-2 bg-[#c19a6b] text-[#0a0a0a] rounded-lg font-medium hover:bg-[#d4ad7e] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="text-gray-400 text-sm">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-gray-500 text-sm py-4 text-center">
          No notes yet. Add your reflections above.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-[#1a1a1a] rounded-lg">
              {note.highlight_text && (
                <div className="mb-2 pl-3 border-l-2 border-[#c19a6b] text-gray-400 text-sm italic">
                  "{note.highlight_text}"
                </div>
              )}

              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 bg-[#0a0a0a] border border-[#333] rounded text-[#f7f3ed] focus:outline-none focus:ring-1 focus:ring-[#c19a6b] resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      className="px-3 py-1 bg-[#c19a6b] text-[#0a0a0a] rounded text-sm hover:bg-[#d4ad7e]"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-[#333] text-gray-300 rounded text-sm hover:bg-[#444]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-300 whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(note)}
                        className="text-xs text-gray-400 hover:text-[#c19a6b]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-xs text-gray-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
