export interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string;
  kycStatus: KycStatus;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  balance?: UserBalance | null;
}

export type KycStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface UserBalance {
  balance: string;
  usdtBalance?: string;
  currency: string;
}

export type BalanceTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'ORDER_PAYMENT'
  | 'ORDER_REFUND'
  | 'ADJUSTMENT'
  | 'USDT_DEPOSIT'
  | 'USDT_WITHDRAWAL'
  | 'KES_WITHDRAWAL';

export type BalanceTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface BalanceTransaction {
  id: string;
  type: BalanceTransactionType;
  status: BalanceTransactionStatus;
  currency?: string;
  amount: string;
  usdtAmount?: string;
  balanceBefore: string;
  balanceAfter: string;
  reference: string | null;
  orderId: string | null;
  description: string | null;
  phoneNumber?: string | null;
  txHash?: string | null;
  walletAddress?: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface BalanceWithHistory {
  balance: UserBalance & { id: string; usdtBalance: string; updatedAt: string };
  transactions: BalanceTransaction[];
  pagination: Pagination;
}

export interface UsdtBalance {
  usdtBalance: string;
  depositAddress: string;
  network: string;
}

export interface UsdtTransaction {
  id: string;
  type: 'USDT_DEPOSIT' | 'USDT_WITHDRAWAL';
  status: BalanceTransactionStatus;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  txHash: string | null;
  walletAddress: string | null;
  description: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ExchangeRate {
  id: string;
  pair: string;
  buyRate: string;
  sellRate: string;
  midRate: string;
  spread: string;
  minAmount: string;
  maxAmount: string;
  isActive: boolean;
  lastUpdated: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
  message?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
