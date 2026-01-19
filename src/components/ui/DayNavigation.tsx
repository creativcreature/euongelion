import Link from 'next/link';
import { Series } from '@/lib/types';

interface Props {
  series: Series;
  currentDay: number;
}

export function DayNavigation({ series, currentDay }: Props) {
  const prevDay = currentDay > 1 ? currentDay - 1 : null;
  const nextDay = currentDay < series.day_count ? currentDay + 1 : null;

  return (
    <nav className="flex items-center justify-between py-4 border-t border-zinc-200 dark:border-zinc-700 mt-8">
      {prevDay ? (
        <Link
          href={`/series/${series.slug}/${prevDay}`}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          <span>
            <span className="text-zinc-400 dark:text-zinc-500">Day {prevDay}:</span>{' '}
            {series.days.find(d => d.day_number === prevDay)?.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {nextDay ? (
        <Link
          href={`/series/${series.slug}/${nextDay}`}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <span>
            <span className="text-zinc-400 dark:text-zinc-500">Day {nextDay}:</span>{' '}
            {series.days.find(d => d.day_number === nextDay)?.title}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
