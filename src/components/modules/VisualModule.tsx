'use client'

import Image from 'next/image'

interface VisualModuleProps {
  data: {
    src: string
    alt: string
    caption?: string
    credit?: string
    aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4'
  }
}

export default function VisualModule({ data }: VisualModuleProps) {
  const aspectRatios = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '3:4': 'aspect-[3/4]',
  }
  
  const aspectClass = aspectRatios[data.aspectRatio || '16:9']

  return (
    <figure className="my-8">
      <div className={`relative ${aspectClass} rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800`}>
        <Image
          src={data.src}
          alt={data.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      {(data.caption || data.credit) && (
        <figcaption className="mt-3 text-center">
          {data.caption && (
            <p className="text-sm text-stone-600 dark:text-stone-300 italic">
              {data.caption}
            </p>
          )}
          {data.credit && (
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
              {data.credit}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  )
}
