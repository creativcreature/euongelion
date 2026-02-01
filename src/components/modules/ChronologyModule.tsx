'use client'

interface ChronologyModuleProps {
  data: {
    title?: string
    events: Array<{
      date: string
      event: string
      significance?: string
    }>
    note?: string
  }
}

export default function ChronologyModule({ data }: ChronologyModuleProps) {
  return (
    <div className="my-8 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      {data.title && (
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          {data.title}
        </h3>
      )}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[#c19a6b]/30" />
        
        <div className="space-y-6">
          {data.events.map((event, index) => (
            <div key={index} className="relative pl-10">
              {/* Timeline dot */}
              <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-[#c19a6b]" />
              
              <div>
                <span className="text-sm font-medium text-[#c19a6b]">{event.date}</span>
                <p className="text-stone-800 dark:text-stone-200 mt-1">{event.event}</p>
                {event.significance && (
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 italic">
                    {event.significance}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {data.note && (
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400 italic border-t border-stone-200 dark:border-stone-700 pt-4">
          {data.note}
        </p>
      )}
    </div>
  )
}
