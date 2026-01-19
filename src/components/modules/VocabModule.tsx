import { VocabData } from '@/lib/types';

interface Props {
  data: VocabData;
}

const languageColors: Record<string, string> = {
  hebrew: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  greek: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  latin: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
};

const languageLabels: Record<string, string> = {
  hebrew: 'Hebrew',
  greek: 'Greek',
  latin: 'Latin',
};

export function VocabModule({ data }: Props) {
  const { language, word, transliteration, pronunciation, strongs, definition, root_meaning, usage_note } = data;

  return (
    <div className={`my-6 p-5 rounded-lg border ${languageColors[language] || 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {languageLabels[language] || language}
          </span>
          <h4 className="text-3xl font-bold mt-1 text-zinc-900 dark:text-zinc-100" dir={language === 'hebrew' ? 'rtl' : 'ltr'}>
            {word}
          </h4>
        </div>
        {strongs && strongs !== 'N/A' && (
          <span className="text-xs font-mono bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
            {strongs}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{transliteration}</span>
          <span className="text-zinc-500 dark:text-zinc-400">/{pronunciation}/</span>
        </div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{definition}</p>
        <p className="text-zinc-600 dark:text-zinc-400 italic">{root_meaning}</p>
      </div>

      {usage_note && (
        <p className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {usage_note}
        </p>
      )}
    </div>
  );
}
