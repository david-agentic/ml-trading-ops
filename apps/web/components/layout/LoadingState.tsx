import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  /** Number of skeleton rows to render — match the target layout's row count. */
  rows?: number;
}

/** Skeleton-based, not a spinner, per CLAUDE.md §15. */
export function LoadingState({ rows = 4 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key -- static skeleton placeholders, no stable id exists
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
