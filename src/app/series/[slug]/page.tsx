import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeriesBySlug, getAllSeriesSlugs } from '@/lib/content';
import { PathwayBadge } from '@/components/ui/PathwayBadge';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = getAllSeriesSlugs();
    if (!slugs || slugs.length === 0) {
      return [];
    }
    return slugs.map(slug => ({ slug }));
  } catch (error) {
    console.error('Error generating static params for series:', error);
    return [];
  }
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);

  if (!series) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            &larr; Back to all series
          </Link>
        </nav>

        {/* Series Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <PathwayBadge pathway={series.pathway} />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {series.day_count} days
            </span>
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {series.title}
          </h1>

          {series.subtitle && (
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {series.subtitle}
            </p>
          )}
        </header>

        {/* Core Theme */}
        {series.core_theme && (
          <div className="mb-8 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Core Theme
            </h2>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {series.core_theme}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
          {series.gospel_presentation && (
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500 dark:text-zinc-400">Gospel:</span>{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                {series.gospel_presentation}
              </span>
            </div>
          )}
          {series.ecclesiastes_connection && (
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <span className="text-zinc-500 dark:text-zinc-400">Ecclesiastes:</span>{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                {series.ecclesiastes_connection}
              </span>
            </div>
          )}
        </div>

        {/* Day List */}
        <section>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Days
          </h2>

          <div className="space-y-2">
            {series.days.map(day => (
              <Link
                key={day.day_number}
                href={`/series/${series.slug}/${day.day_number}`}
                className="block p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Day {day.day_number}
                      </span>
                      {day.chiasm_position && (
                        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
                          {day.chiasm_position}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {day.title}
                    </h3>
                    {day.subtitle && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {day.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Target Audience & Circumstances */}
        {(series.target_audience || series.life_circumstances || series.emotional_tones) && (
          <section className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-700">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
              Series Metadata
            </h2>

            <div className="space-y-4 text-sm">
              {series.target_audience && series.target_audience.length > 0 && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Target Audience:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {series.target_audience.map((audience, i) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                        {audience}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {series.life_circumstances && series.life_circumstances.length > 0 && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Life Circumstances:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {series.life_circumstances.map((circumstance, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded text-xs">
                        {circumstance}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {series.emotional_tones && series.emotional_tones.length > 0 && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Emotional Tones:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {series.emotional_tones.map((tone, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
