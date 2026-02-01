'use client'

interface GeographyModuleProps {
  data: {
    location: string
    description: string
    modernName?: string
    significance: string
    coordinates?: {
      lat: number
      lng: number
    }
    image?: string
  }
}

export default function GeographyModule({ data }: GeographyModuleProps) {
  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#c19a6b]/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#c19a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {data.location}
          </h3>
          {data.modernName && (
            <p className="text-sm text-[#c19a6b]">Modern: {data.modernName}</p>
          )}
          <p className="mt-2 text-stone-600 dark:text-stone-300">{data.description}</p>
          <div className="mt-4 p-3 bg-[#c19a6b]/10 rounded-lg">
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Biblical Significance</p>
            <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">{data.significance}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
