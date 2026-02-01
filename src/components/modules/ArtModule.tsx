'use client'

import Image from 'next/image'

interface ArtModuleProps {
  data: {
    title: string
    artist: string
    year?: string
    medium?: string
    src: string
    alt: string
    description: string
    spiritualInsight: string
  }
}

export default function ArtModule({ data }: ArtModuleProps) {
  return (
    <div className="my-8 bg-stone-50 dark:bg-stone-900 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
      <div className="relative aspect-[4/3] bg-stone-200 dark:bg-stone-800">
        <Image
          src={data.src}
          alt={data.alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 800px"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-serif italic text-stone-900 dark:text-stone-100">
          {data.title}
        </h3>
        <p className="text-sm text-[#c19a6b] mt-1">
          {data.artist}
          {data.year && `, ${data.year}`}
          {data.medium && ` • ${data.medium}`}
        </p>
        
        <p className="mt-4 text-stone-600 dark:text-stone-300">
          {data.description}
        </p>
        
        <div className="mt-4 p-4 bg-[#c19a6b]/10 rounded-lg border-l-4 border-[#c19a6b]">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-1">
            Spiritual Insight
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-300 italic">
            {data.spiritualInsight}
          </p>
        </div>
      </div>
    </div>
  )
}
