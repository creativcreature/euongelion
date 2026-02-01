'use client'

interface ProfileModuleProps {
  data: {
    name: string
    title?: string
    era?: string
    description: string
    keyVerse?: string
    lessons: string[]
    image?: string
  }
}

export default function ProfileModule({ data }: ProfileModuleProps) {
  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-[#c19a6b]/20 flex items-center justify-center text-2xl font-serif text-[#c19a6b]">
          {data.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {data.name}
          </h3>
          {data.title && (
            <p className="text-sm text-[#c19a6b]">{data.title}</p>
          )}
          {data.era && (
            <p className="text-xs text-stone-500 dark:text-stone-400">{data.era}</p>
          )}
        </div>
      </div>
      
      <p className="mt-4 text-stone-600 dark:text-stone-300 leading-relaxed">
        {data.description}
      </p>
      
      {data.keyVerse && (
        <blockquote className="mt-4 pl-4 border-l-4 border-[#c19a6b] italic text-stone-600 dark:text-stone-300">
          {data.keyVerse}
        </blockquote>
      )}
      
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wide mb-2">
          What We Learn
        </h4>
        <ul className="space-y-2">
          {data.lessons.map((lesson, index) => (
            <li key={index} className="flex gap-2 text-sm text-stone-600 dark:text-stone-300">
              <span className="text-[#c19a6b]">•</span>
              {lesson}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
