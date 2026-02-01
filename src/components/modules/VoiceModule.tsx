'use client'

import { useState, useRef } from 'react'

interface VoiceModuleProps {
  data: {
    title?: string
    description?: string
    audioSrc: string
    duration?: string
    speaker?: string
    transcript?: string
  }
}

export default function VoiceModule({ data }: VoiceModuleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      <audio
        ref={audioRef}
        src={data.audioSrc}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-14 h-14 rounded-full bg-[#c19a6b] text-white flex items-center justify-center hover:bg-[#a88756] transition"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        
        <div className="flex-1">
          {data.title && (
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">
              {data.title}
            </h3>
          )}
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            {data.speaker && <span>{data.speaker}</span>}
            {data.speaker && data.duration && <span>•</span>}
            {data.duration && <span>{data.duration}</span>}
          </div>
          {data.description && (
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {data.description}
            </p>
          )}
        </div>
      </div>
      
      {data.transcript && (
        <div className="mt-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-[#c19a6b] hover:underline"
          >
            {showTranscript ? 'Hide transcript' : 'Show transcript'}
          </button>
          {showTranscript && (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300 italic leading-relaxed">
              {data.transcript}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
