import { Pathway } from '@/lib/types';

interface Props {
  pathway: Pathway;
  size?: 'sm' | 'md' | 'lg';
}

const pathwayStyles: Record<Pathway, string> = {
  Sleep: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  Awake: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Shepherd: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function PathwayBadge({ pathway, size = 'md' }: Props) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${pathwayStyles[pathway]} ${sizeStyles[size]}`}>
      {pathway}
    </span>
  );
}
