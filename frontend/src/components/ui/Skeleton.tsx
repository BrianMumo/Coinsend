import { HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className = '', ...props }: SkeletonProps) => (
  <div
    className={`animate-pulse rounded-xl bg-surface-700/30 ${className}`}
    {...props}
  />
);

export const DashboardSkeleton = () => (
  <div className="space-y-4 pb-4">
    {/* Header */}
    <div className="flex items-center justify-between pt-1">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-4 w-24" /></div>
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    {/* Balance card */}
    <Skeleton className="h-56 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(245,166,35,0.1) 100%)' }} />
    {/* Transaction list */}
    <div className="bg-dark-800/50 rounded-2xl p-4 space-y-4">
      <div className="flex justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-16" /></div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-20" /></div>
          </div>
          <div className="text-right"><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-3 w-14" /></div>
        </div>
      ))}
    </div>
  </div>
);

export const WalletSkeleton = () => (
  <div className="space-y-4 pb-4">
    <Skeleton className="h-52 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(245,166,35,0.1) 100%)' }} />
    <div className="bg-dark-800/50 rounded-2xl p-4 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div><Skeleton className="h-4 w-28 mb-1" /><Skeleton className="h-3 w-20" /></div>
          </div>
          <div className="text-right"><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-3 w-14" /></div>
        </div>
      ))}
    </div>
  </div>
);
