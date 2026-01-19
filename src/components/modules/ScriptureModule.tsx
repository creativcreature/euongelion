import { ScriptureData } from '@/lib/types';

interface Props {
  data: ScriptureData;
}

export function ScriptureModule({ data }: Props) {
  const { reference, translation, text, emphasis } = data;

  // Highlight emphasized words
  let displayText = text;
  if (emphasis && emphasis.length > 0) {
    emphasis.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      displayText = displayText.replace(regex, '<mark class="bg-amber-100 dark:bg-amber-900/40 px-0.5 rounded">$1</mark>');
    });
  }

  return (
    <blockquote className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 pl-6 pr-4 py-4 my-6 rounded-r-lg">
      <p
        className="text-lg leading-relaxed text-zinc-800 dark:text-zinc-200 italic"
        dangerouslySetInnerHTML={{ __html: displayText }}
      />
      <footer className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
        {reference} <span className="text-zinc-400 dark:text-zinc-500">({translation})</span>
      </footer>
    </blockquote>
  );
}
