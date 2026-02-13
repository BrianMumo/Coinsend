import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div
    className={clsx(
      'animate-pulse rounded-lg bg-gray-200',
      className
    )}
  />
);

/** Skeleton for the balance card on Dashboard/Wallet */
export const BalanceCardSkeleton = () => (
  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white relative overflow-hidden">
    <div className="relative space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded bg-white/20" />
        <Skeleton className="h-4 w-24 bg-white/20" />
      </div>
      <Skeleton className="h-9 w-48 bg-white/20" />
      <Skeleton className="h-4 w-32 bg-white/20" />
      <div className="flex gap-3 mt-4">
        <Skeleton className="h-10 flex-1 bg-white/20 rounded-xl" />
        <Skeleton className="h-10 flex-1 bg-white/20 rounded-xl" />
      </div>
    </div>
  </div>
);

/** Skeleton for a single transaction row */
export const TransactionRowSkeleton = () => (
  <div className="flex items-center justify-between p-3">
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <div className="text-right space-y-1.5">
      <Skeleton className="h-4 w-16 ml-auto" />
      <Skeleton className="h-3 w-12 ml-auto" />
    </div>
  </div>
);

/** Skeleton for transaction list */
export const TransactionListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="divide-y divide-gray-50">
    {Array.from({ length: rows }).map((_, i) => (
      <TransactionRowSkeleton key={i} />
    ))}
  </div>
);

/** Skeleton for the dashboard page */
export const DashboardSkeleton = () => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
    {/* Balance card */}
    <BalanceCardSkeleton />
    {/* Info bar */}
    <Skeleton className="h-10 w-full rounded-xl" />
    {/* Transactions */}
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-14" />
      </div>
      <TransactionListSkeleton rows={5} />
    </div>
  </div>
);

/** Skeleton for wallet page */
export const WalletSkeleton = () => (
  <div className="space-y-4">
    <BalanceCardSkeleton />
    {/* Rate bar */}
    <Skeleton className="h-10 w-full rounded-xl" />
    {/* Tab bar */}
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="flex border-b border-gray-100">
        <Skeleton className="flex-1 h-10 rounded-none" />
        <Skeleton className="flex-1 h-10 rounded-none" />
        <Skeleton className="flex-1 h-10 rounded-none" />
      </div>
      <TransactionListSkeleton rows={5} />
    </div>
  </div>
);
