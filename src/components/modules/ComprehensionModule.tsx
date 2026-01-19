import { ComprehensionData } from '@/lib/types';

interface Props {
  data: ComprehensionData;
}

export function ComprehensionModule({ data }: Props) {
  const { question, options, explanation } = data;

  return (
    <div className="my-6 p-5 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 0 1-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 0 1-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 0 1-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584ZM12 18a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
        </svg>
        Comprehension Check
      </h4>

      <p className="text-zinc-900 dark:text-zinc-100 font-medium mb-4">
        {question}
      </p>

      <div className="space-y-2 mb-4">
        {options.map((option, i) => (
          <div
            key={i}
            className={`p-3 rounded border ${
              option.correct
                ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {option.correct ? (
                <span className="text-green-600 dark:text-green-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                </span>
              ) : (
                <span className="text-zinc-400 dark:text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              <span className={`text-sm ${option.correct ? 'text-green-800 dark:text-green-200 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {option.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-orange-200 dark:border-orange-800">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-orange-700 dark:text-orange-300">Explanation:</span> {explanation}
        </p>
      </div>
    </div>
  );
}
