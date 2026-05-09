import { classNames } from '../utils/format.js';

export function Skeleton({ className }) {
  return <div className={classNames('skeleton', className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="ml-auto h-4 w-20" />
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card-elevated p-5">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}
