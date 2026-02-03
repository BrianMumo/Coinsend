// User types
export interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  country: string;
  kycStatus: KycStatus;
  createdAt?: string;
  lastLoginAt?: string;
}

export type KycStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

// Admin types
export interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'VIEWER';

// Order types
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  orderType: OrderType;
  status: OrderStatus;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  fee: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  payoutMethod: string | null;
  payoutReference: string | null;
  payoutDestination: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientBank: string | null;
  recipientAccount: string | null;
  processingNotes: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  user?: Partial<User>;
}

export type OrderType = 'CRYPTO_TO_KES' | 'KES_TO_CRYPTO' | 'CROSS_BORDER' | 'OTC';
export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

// Rate types
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

// Liquidity types
export interface LiquidityBalance {
  id: string;
  currency: string;
  balance: string;
  lastUpdated: string;
  notes: string | null;
}

// Wallet types
export interface Wallet {
  id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  isActive: boolean;
}

// API types
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

// Payment instructions
export interface PaymentInstructions {
  type: string;
  message: string;
  details: Record<string, string>;
  note: string;
}

// Dashboard stats
export interface DashboardStats {
  users: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    processing: number;
    completed: number;
    today: number;
  };
  volume: {
    today: string | number;
  };
}
