import SeriesClient from './SeriesClient';

// Required for static export
export function generateStaticParams() {
  return [
    { slug: 'identity' },
    { slug: 'peace' },
    { slug: 'community' },
    { slug: 'kingdom' },
    { slug: 'provision' },
    { slug: 'truth' },
    { slug: 'hope' },
  ];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  return <SeriesClient slug={slug} />;
}
