// User types
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

// User Balance types
export interface UserBalance {
  balance: string;
  usdtBalance?: string;
  currency: string;
}

export type BalanceTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'ORDER_PAYMENT' | 'ORDER_REFUND' | 'ADJUSTMENT' | 'USDT_DEPOSIT' | 'USDT_WITHDRAWAL' | 'KES_WITHDRAWAL';
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
  orderNumber?: string | null;
  orderType?: OrderType | null;
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

// USDT Balance types
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

// Payment source for orders
export type PaymentSource = 'MPESA_STK' | 'MPESA_MANUAL' | 'ACCOUNT_BALANCE';

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

// M-Pesa types
export type MpesaTransactionType = 'C2B_STK_PUSH' | 'C2B_PAYBILL' | 'B2C_PAYMENT' | 'BALANCE_QUERY' | 'REVERSAL';
export type MpesaTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';

export interface MpesaTransaction {
  id: string;
  transactionType: MpesaTransactionType;
  status: MpesaTransactionStatus;
  originatorConversationId: string | null;
  conversationId: string | null;
  commandId: string | null;
  amount: string;
  phoneNumber: string | null;
  shortcode: string | null;
  mpesaReceiptNumber: string | null;
  resultCode: number | null;
  resultDesc: string | null;
  receiverPartyPublicName: string | null;
  b2cUtilityBalance: string | null;
  b2cWorkingBalance: string | null;
  orderId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  // Reversal related fields
  reversedTransactionId: string | null;
  isReversed: boolean;
  order?: { orderNumber: string } | null;
  initiatedBy?: { firstName: string; lastName: string; email: string } | null;
}

export interface MpesaBalance {
  workingBalance: number | null;
  utilityBalance: number | null;
  lastUpdated: string | null;
}

export interface B2CPaymentRequest {
  phoneNumber: string;
  amount: number;
  commandId?: 'BusinessPayment' | 'SalaryPayment' | 'PromotionPayment';
  remarks?: string;
  orderId?: string;
}
