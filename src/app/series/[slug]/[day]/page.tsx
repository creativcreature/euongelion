import { notFound } from 'next/navigation';
import Link from 'next/link';
// import { getSeriesBySlug, getDay, getAllDayPaths } from '@/lib/content';
import { PathwayBadge } from '@/components/ui/PathwayBadge';
import { DayNavigation } from '@/components/ui/DayNavigation';
import { ModuleRenderer } from '@/components/modules/ModuleRenderer';

// Temporary stubs - page blocked by middleware anyway
const getSeriesBySlug = (slug: string): any => null;
const getDay = (slug: string, day: number): any => null;
const getAllDayPaths = (): any[] => [];

interface Props {
  params: Promise<{ slug: string; day: string }>;
}

export async function generateStaticParams() {
  // All series and their days for static export
  const series = ['identity', 'peace', 'community', 'kingdom', 'provision', 'truth', 'hope'];
  const days = ['1', '2', '3', '4', '5'];
  
  const paths: { slug: string; day: string }[] = [];
  for (const slug of series) {
    for (const day of days) {
      paths.push({ slug, day });
    }
  }
  return paths;
}

export default async function DayPage({ params }: Props) {
  const { slug, day: dayParam } = await params;
  const dayNumber = parseInt(dayParam, 10);

  const series = getSeriesBySlug(slug);
  const day = getDay(slug, dayNumber);

  if (!series || !day) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Home
          </Link>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <Link
            href={`/series/${series.slug}`}
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            {series.title}
          </Link>
          <span className="text-zinc-400 dark:text-zinc-500">/</span>
          <span className="text-zinc-700 dark:text-zinc-300">Day {dayNumber}</span>
        </nav>

        {/* Day Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <PathwayBadge pathway={series.pathway} size="sm" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Day {dayNumber} of {series.day_count}
            </span>
            {day.chiasm_position && (
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
                Position: {day.chiasm_position}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {day.title}
          </h1>

          {day.subtitle && (
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {day.subtitle}
            </p>
          )}
        </header>

        {/* Module Count Summary */}
        <div className="mb-8 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400">
          {day.modules.length} modules in this day
        </div>

        {/* Modules */}
        <article className="prose-reading">
          {day.modules?.map((module: any, index: number) => (
            <ModuleRenderer key={index} module={module} />
          ))}
        </article>

        {/* Day Navigation */}
        <DayNavigation series={series} currentDay={dayNumber} />

        {/* Back to Series */}
        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-700 text-center">
          <Link
            href={`/series/${series.slug}`}
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            &larr; Back to {series.title}
          </Link>
        </div>
      </div>
    </div>
  );
}
