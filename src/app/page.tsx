import { getSeriesByPathway, getTotalDayCount, getAllSeries } from '@/lib/content';
import { SeriesCard } from '@/components/ui/SeriesCard';
import { Pathway } from '@/lib/types';

const pathwayDescriptions: Record<Pathway, string> = {
  Sleep: 'For those awakening to faith, exploring foundational truths',
  Awake: 'For growing believers, deepening understanding and practice',
  Shepherd: 'For mature disciples, equipping to lead and teach others',
};

const pathwayColors: Record<Pathway, string> = {
  Sleep: 'border-blue-500',
  Awake: 'border-amber-500',
  Shepherd: 'border-green-500',
};

export default function HomePage() {
  const seriesByPathway = getSeriesByPathway();
  const totalSeries = getAllSeries().length;
  const totalDays = getTotalDayCount();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Devotional Series Review
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {totalSeries} series &middot; {totalDays} days of content
          </p>
        </header>

        {/* Pathway Sections */}
        <div className="space-y-12">
          {(['Sleep', 'Awake', 'Shepherd'] as Pathway[]).map(pathway => (
            <section key={pathway}>
              <div className={`border-l-4 ${pathwayColors[pathway]} pl-4 mb-6`}>
                <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {pathway} Pathway
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {pathwayDescriptions[pathway]} &middot; {seriesByPathway[pathway].length} series
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {seriesByPathway[pathway].map(series => (
                  <SeriesCard key={series.slug} series={series} />
                ))}
              </div>

              {seriesByPathway[pathway].length === 0 && (
                <p className="text-zinc-500 dark:text-zinc-500 italic">
                  No series in this pathway yet.
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
