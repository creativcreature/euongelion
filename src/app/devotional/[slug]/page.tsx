import DevotionalClient from './DevotionalClient';

// Required for static export
export function generateStaticParams() {
  return [
    { slug: 'community-day-1' }, { slug: 'community-day-2' }, { slug: 'community-day-3' }, { slug: 'community-day-4' }, { slug: 'community-day-5' },
    { slug: 'day-1' }, { slug: 'day-2' }, { slug: 'day-3' }, { slug: 'day-4' }, { slug: 'day-5' }, { slug: 'day-6' }, { slug: 'day-7' },
    { slug: 'hope-day-1' }, { slug: 'hope-day-2' }, { slug: 'hope-day-3' }, { slug: 'hope-day-4' }, { slug: 'hope-day-5' },
    { slug: 'identity-crisis-day-1' }, { slug: 'identity-crisis-day-2' }, { slug: 'identity-crisis-day-3' }, { slug: 'identity-crisis-day-4' }, { slug: 'identity-crisis-day-5' },
    { slug: 'kingdom-day-1' }, { slug: 'kingdom-day-2' }, { slug: 'kingdom-day-3' }, { slug: 'kingdom-day-4' }, { slug: 'kingdom-day-5' },
    { slug: 'peace-day-1' }, { slug: 'peace-day-2' }, { slug: 'peace-day-3' }, { slug: 'peace-day-4' }, { slug: 'peace-day-5' },
    { slug: 'provision-day-1' }, { slug: 'provision-day-2' }, { slug: 'provision-day-3' }, { slug: 'provision-day-4' }, { slug: 'provision-day-5' },
    { slug: 'truth-day-1' }, { slug: 'truth-day-2' }, { slug: 'truth-day-3' }, { slug: 'truth-day-4' }, { slug: 'truth-day-5' },
  ];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DevotionalPage({ params }: Props) {
  const { slug } = await params;
  return <DevotionalClient slug={slug} />;
}
