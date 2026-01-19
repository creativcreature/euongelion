import { TeachingData } from '@/lib/types';

interface Props {
  data: TeachingData;
}

const pardesLabels: Record<string, string> = {
  peshat: 'Literal',
  remez: 'Symbolic',
  derash: 'Homiletical',
  sod: 'Mystical',
};

export function TeachingModule({ data }: Props) {
  const { content, pardes_layer } = data;

  // Convert markdown-style formatting to HTML
  const formatContent = (text: string) => {
    return text
      .split('\n\n')
      .map((paragraph, i) => {
        // Handle bold headers like **Title**
        let formatted = paragraph.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-900 dark:text-zinc-100">$1</strong>');

        // Check if this is a header-only paragraph
        if (paragraph.startsWith('**') && paragraph.endsWith('**') && !paragraph.slice(2, -2).includes('**')) {
          return `<h4 key="${i}" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-6 mb-2">${formatted.replace(/<\/?strong[^>]*>/g, '')}</h4>`;
        }

        return `<p key="${i}" class="mb-4 last:mb-0">${formatted}</p>`;
      })
      .join('');
  };

  return (
    <div className="my-6">
      {pardes_layer && (
        <div className="mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
            {pardesLabels[pardes_layer] || pardes_layer} Interpretation
          </span>
        </div>
      )}
      <div
        className="prose prose-zinc dark:prose-invert max-w-none leading-[1.7] text-zinc-700 dark:text-zinc-300"
        dangerouslySetInnerHTML={{ __html: formatContent(content) }}
      />
    </div>
  );
}
