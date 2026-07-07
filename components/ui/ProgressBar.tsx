import { cn } from '@/lib/utils';

export function ProgressBar({ percentual, tom }: { percentual: number; tom?: 'auto' | 'brand' }) {
  const p = Math.max(0, Math.min(100, percentual));

  const cor =
    tom === 'brand'
      ? 'bg-brand-500'
      : p >= 100
      ? 'bg-negative'
      : p >= 80
      ? 'bg-amber-500'
      : 'bg-positive';

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={cn('h-full rounded-full transition-all', cor)} style={{ width: `${p}%` }} />
    </div>
  );
}
