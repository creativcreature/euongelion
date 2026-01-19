import { InteractiveData } from '@/lib/types';

interface Props {
  data: InteractiveData;
}

export function InteractiveModule({ data }: Props) {
  const { interaction_type, prompt, options, follow_up } = data;

  return (
    <div className="my-6 p-5 bg-fuchsia-50 dark:bg-fuchsia-950/30 border border-fuchsia-200 dark:border-fuchsia-800 rounded-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300 mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06l-1.591-1.59a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.59-1.591a.75.75 0 0 1 1.061 0Zm-6.816 4.496a.75.75 0 0 1 .82.311l5.228 7.917a.75.75 0 0 1-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 0 1-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 0 1-1.247-.606l.569-9.47a.75.75 0 0 1 .554-.68ZM3 10.5a.75.75 0 0 1 .75-.75H6a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10.5Zm14.25 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1-.75-.75Zm-8.962 3.712a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Interactive - {interaction_type}
      </h4>

      <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-4">
        {prompt}
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map((option, i) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-fuchsia-200 dark:border-fuchsia-700 rounded-full text-sm text-zinc-700 dark:text-zinc-300"
          >
            {option}
          </span>
        ))}
      </div>

      {follow_up && (
        <p className="mt-4 pt-4 border-t border-fuchsia-200 dark:border-fuchsia-800 text-sm text-zinc-600 dark:text-zinc-400 italic">
          {follow_up}
        </p>
      )}
    </div>
  );
}
