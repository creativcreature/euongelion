import { InsightData } from '@/lib/types';

interface Props {
  data: InsightData;
}

export function InsightModule({ data }: Props) {
  const { text } = data;

  return (
    <div className="my-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-lg">
      <div className="flex items-start gap-3">
        <span className="text-emerald-600 dark:text-emerald-400 text-xl flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
          </svg>
        </span>
        <p className="text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
