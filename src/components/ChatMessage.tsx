'use client'

import { typographer } from '@/lib/typographer'
import type { ChatMessage as ChatMessageType, ChatColorLabel } from '@/types'

const COLOR_LABEL_MAP: Record<ChatColorLabel, string> = {
  gold: 'var(--color-gold)',
  burgundy: 'var(--color-burgundy-light)',
  olive: 'var(--color-olive-light)',
  shalom: 'var(--color-shalom-light)',
  none: 'transparent',
}

export default function ChatMessage({
  message,
  onToggleFavorite,
  onSetColorLabel,
  onSaveNote,
}: {
  message: ChatMessageType
  onToggleFavorite: (id: string) => void
  onSetColorLabel: (id: string, label: ChatColorLabel) => void
  onSaveNote?: (message: ChatMessageType) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`mb-4 ${isUser ? 'ml-8 text-right' : 'mr-8'}`}
      style={{
        borderLeft:
          !isUser && message.colorLabel !== 'none'
            ? `3px solid ${COLOR_LABEL_MAP[message.colorLabel]}`
            : undefined,
        paddingLeft:
          !isUser && message.colorLabel !== 'none' ? '12px' : undefined,
      }}
    >
      {/* Message bubble */}
      <div
        className={`inline-block rounded-sm px-4 py-3 text-left ${
          isUser ? 'bg-surface-raised' : ''
        }`}
        style={{
          maxWidth: '100%',
          border: isUser ? '1px solid var(--color-border)' : undefined,
        }}
      >
        <p
          className={`vw-small leading-relaxed ${
            isUser ? '' : 'text-serif-italic'
          } text-secondary`}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {typographer(message.content)}
        </p>
      </div>

      {/* Actions (assistant messages only) */}
      {!isUser && (
        <div className="mt-2 flex items-center gap-3">
          {/* Favorite toggle */}
          <button
            onClick={() => onToggleFavorite(message.id)}
            className="vw-small text-muted transition-colors duration-200 hover:text-gold"
            aria-label={
              message.favorited ? 'Remove from favorites' : 'Add to favorites'
            }
          >
            {message.favorited ? '\u2605' : '\u2606'}
          </button>

          {/* Color labels */}
          {(['gold', 'burgundy', 'olive', 'shalom'] as ChatColorLabel[]).map(
            (label) => (
              <button
                key={label}
                onClick={() =>
                  onSetColorLabel(
                    message.id,
                    message.colorLabel === label ? 'none' : label,
                  )
                }
                className="h-3 w-3 rounded-full transition-opacity duration-200 hover:opacity-100"
                style={{
                  backgroundColor: COLOR_LABEL_MAP[label],
                  opacity: message.colorLabel === label ? 1 : 0.3,
                }}
                aria-label={`Label as ${label}`}
              />
            ),
          )}

          {onSaveNote && (
            <button
              onClick={() => onSaveNote(message)}
              className="vw-small text-muted transition-colors duration-200 hover:text-gold"
            >
              Save note
            </button>
          )}
        </div>
      )}
    </div>
  )
}
