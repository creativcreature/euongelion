import { PrayerData } from '@/lib/types';

interface Props {
  data: PrayerData;
}

export function PrayerModule({ data }: Props) {
  const { title, text, scripture_echo } = data;

  return (
    <div className="my-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-indigo-600 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM15.375 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" />
          </svg>
        </span>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
          {title || 'Prayer'}
        </h4>
      </div>
      <p className="text-zinc-800 dark:text-zinc-200 leading-[1.8] italic">
        {text}
      </p>
      {scripture_echo && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Based on {scripture_echo}
        </p>
      )}
    </div>
  );
}
