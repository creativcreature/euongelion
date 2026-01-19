import { BridgeData } from '@/lib/types';

interface Props {
  data: BridgeData;
}

export function BridgeModule({ data }: Props) {
  const { ancient, modern, connection, question } = data;

  return (
    <div className="my-6 p-5 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H7.5a.75.75 0 0 1 0-1.5h11.69l-3.22-3.22a.75.75 0 0 1 0-1.06Zm-7.94 9a.75.75 0 0 1 0 1.06l-3.22 3.22H16.5a.75.75 0 0 1 0 1.5H4.81l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Ancient-Modern Bridge
      </h4>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-cyan-100 dark:border-cyan-900">
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">Then</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{ancient}</p>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-cyan-100 dark:border-cyan-900">
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">Now</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{modern}</p>
        </div>
      </div>

      <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
        <span className="font-semibold">Connection:</span> {connection}
      </p>

      {question && (
        <p className="mt-4 pt-4 border-t border-cyan-200 dark:border-cyan-800 text-zinc-800 dark:text-zinc-200 font-medium italic">
          {question}
        </p>
      )}
    </div>
  );
}
