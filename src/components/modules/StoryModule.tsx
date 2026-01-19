import { StoryData } from '@/lib/types';

interface Props {
  data: StoryData;
}

export function StoryModule({ data }: Props) {
  const { title, content } = data;

  const paragraphs = content.split('\n\n');

  return (
    <div className="my-6 p-6 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
      {title && (
        <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {title}
        </h4>
      )}
      <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-[1.7]">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
