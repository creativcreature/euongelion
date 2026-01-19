import { TakeawayData } from '@/lib/types';

interface Props {
  data: TakeawayData;
}

export function TakeawayModule({ data }: Props) {
  const { title, text, action } = data;

  // Format text that might contain numbered lists
  const formatText = (content: string) => {
    const lines = content.split('\n');
    const isNumberedList = lines.some(line => /^\d+\./.test(line.trim()));

    if (isNumberedList) {
      return (
        <ol className="list-decimal list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
          {lines.map((line, i) => {
            const match = line.match(/^\d+\.\s*\*\*([^*]+)\*\*:?\s*(.*)/);
            if (match) {
              return (
                <li key={i}>
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{match[1]}</strong>
                  {match[2] && `: ${match[2]}`}
                </li>
              );
            }
            return <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>;
          })}
        </ol>
      );
    }

    return <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{content}</p>;
  };

  return (
    <div className="my-6 p-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-rose-600 dark:text-rose-400 text-xl flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
        </span>
        <div className="flex-1">
          {title && (
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              {title}
            </h4>
          )}
          {formatText(text)}
          {action && (
            <div className="mt-4 pt-4 border-t border-rose-200 dark:border-rose-800">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                <span className="font-semibold">Action:</span> {action}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
