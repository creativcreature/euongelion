'use client'

import { useAudioStore } from '@/stores/audioStore'

/**
 * The way into audio, from anywhere.
 *
 * Founder, 2026-08-19: "wait I should be able to access the audio player on
 * everypage right?" — and he was right, because the previous change had broken
 * exactly that. Taking the picker off `/series` moved discovery into the
 * sidebar, but the sidebar could only be opened by the tucked handle, which
 * requires something to already be queued. With an empty queue the only
 * entry point left on the whole site was the homepage callout.
 *
 * The masthead utilities tier is where this belongs: it is where search and
 * theme already live, it is on every page, and an icon there is the opposite of
 * intrusive — it takes no vertical space and interrupts no reading.
 *
 * The dot is the "not invisible" part. It appears only when something is
 * actually queued, so the control is quiet when there is nothing to return to
 * and legible the moment there is.
 */
export default function AudioHeaderButton({
  className = '',
}: {
  className?: string
}) {
  const setPanelOpen = useAudioStore((s) => s.setPanelOpen)
  const queued = useAudioStore((s) => s.queue.length)
  const playing = useAudioStore((s) => s.playing)

  return (
    <button
      type="button"
      className={`mock-icon-control audio-header-button${className ? ` ${className}` : ''}`}
      onClick={() => setPanelOpen(true)}
      aria-haspopup="dialog"
      aria-label={
        queued > 0
          ? `Listening — ${queued} in the queue. Open the audio sidebar.`
          : 'Open the audio sidebar'
      }
      title="Listen"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1z" />
      </svg>
      {queued > 0 && (
        <span
          className={`audio-header-dot${playing ? ' is-playing' : ''}`}
          aria-hidden="true"
        />
      )}
    </button>
  )
}
