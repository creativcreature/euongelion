'use client'

import { useState } from 'react'
import type { Module } from '@/types'

function buildEmbedUrl(provider: string, id: string): string {
  if (provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${id}?dnt=1`
  }
  return ''
}

function buildThumbnailUrl(provider: string, id: string): string {
  if (provider === 'youtube') {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  }
  return ''
}

export default function VideoModule({ module }: { module: Module }) {
  const [activated, setActivated] = useState(false)

  if (!module.videoProvider || !module.videoId) return null

  const embedUrl = buildEmbedUrl(module.videoProvider, module.videoId)
  const thumbnailUrl = buildThumbnailUrl(module.videoProvider, module.videoId)

  return (
    <figure className="video-module my-12 md:my-16">
      <div
        className="video-module-frame"
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%',
          background: '#0a0a0a',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        {activated ? (
          <iframe
            src={embedUrl}
            title={module.videoTitle || 'Embedded video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setActivated(true)}
            aria-label={`Play video: ${module.videoTitle || 'video'}`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              backgroundImage: thumbnailUrl
                ? `url(${thumbnailUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#0a0a0a',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.65)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
              }}
            >
              ▶
            </span>
          </button>
        )}
      </div>

      {(module.videoTitle ||
        module.videoCaption ||
        module.videoAttribution) && (
        <figcaption className="mt-4 vw-small text-secondary type-prose">
          {module.videoTitle && (
            <strong className="text-primary">{module.videoTitle}</strong>
          )}
          {module.videoCaption && (
            <>
              {module.videoTitle ? ' — ' : ''}
              {module.videoCaption}
            </>
          )}
          {module.videoAttribution && (
            <span
              className="block mt-1 vw-small"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {module.videoAttribution}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
