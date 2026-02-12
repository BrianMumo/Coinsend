import { adminApi } from './client';
import {
  ApiResponse,
  Admin,
  Order,
  User,
  ExchangeRate,
  LiquidityBalance,
  Wallet,
  DashboardStats,
  Pagination,
  OrderStatus,
  MpesaTransaction,
  MpesaBalance,
  B2CPaymentRequest,
} from '../types';

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  admin: Admin;
  token: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  orderType?: string;
  search?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  kycStatus?: string;
  search?: string;
}

export const adminAuthApi = {
  login: async (data: AdminLoginData): Promise<ApiResponse<AdminAuthResponse>> => {
    const response = await adminApi.post('/admin/login', data);
    return response.data;
  },

  getCurrentAdmin: async (): Promise<ApiResponse<{ admin: Admin }>> => {
    const response = await adminApi.get('/admin/me');
    return response.data;
  },
};

export const adminDashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await adminApi.get('/admin/dashboard');
    return response.data;
  },
};

export const adminOrdersApi = {
  getAll: async (params?: OrderListParams): Promise<ApiResponse<Order[]> & { pagination: Pagination }> => {
    const response = await adminApi.get('/admin/orders', { params });
    return response.data;
  },

  updateStatus: async (
    id: string,
    status: OrderStatus,
    processingNotes?: string,
    payoutReference?: string
  ): Promise<ApiResponse<{ order: Order }>> => {
    const response = await adminApi.put(`/admin/orders/${id}/status`, {
      status,
      processingNotes,
      payoutReference
    });
    return response.data;
  },
};

export const adminUsersApi = {
  getAll: async (params?: UserListParams): Promise<ApiResponse<User[]> & { pagination: Pagination }> => {
    const response = await adminApi.get('/admin/users', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<{ user: User & { orders: Order[] } }>> => {
    const response = await adminApi.get(`/admin/users/${id}`);
    return response.data;
  },

  // Suspend or activate user
  updateStatus: async (
    id: string,
    isActive: boolean,
    reason?: string
  ): Promise<ApiResponse<{ user: User }>> => {
    const response = await adminApi.put(`/admin/users/${id}/status`, { isActive, reason });
    return response.data;
  },

  // Update KYC status
  updateKycStatus: async (
    id: string,
    kycStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED',
    notes?: string
  ): Promise<ApiResponse<{ user: User }>> => {
    const response = await adminApi.put(`/admin/users/${id}/kyc`, { kycStatus, notes });
    return response.data;
  },

  // Credit deposit manually
  creditDeposit: async (
    userId: string,
    amount: number,
    txHash: string,
    usdtAmount: number
  ): Promise<ApiResponse<{ userId: string; newBalance: number }>> => {
    const response = await adminApi.post(`/admin/users/${userId}/credit-deposit`, {
      amount,
      txHash,
      usdtAmount,
    });
    return response.data;
  },

  // Adjust USDT balance (admin correction)
  adjustUsdtBalance: async (
    userId: string,
    amount: number,
    reason: string
  ): Promise<ApiResponse<{ userId: string; previousBalance: number; adjustmentAmount: number; newBalance: number }>> => {
    const response = await adminApi.post(`/admin/users/${userId}/adjust-usdt`, {
      amount,
      reason,
    });
    return response.data;
  },
};

// USDT Deposits API
export interface UsdtDeposit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: string;
  txHash: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export const adminDepositsApi = {
  getUsdtDeposits: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<UsdtDeposit[]> & { pagination: Pagination }> => {
    const response = await adminApi.get('/admin/deposits/usdt', { params });
    return response.data;
  },
};

// KES Withdrawals API (conversions from USDT)
export interface KesWithdrawal {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string | null;
  usdtAmount: string;
  phoneNumber: string | null;
  description: string | null;
  status: string;
  reference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const adminWithdrawalsApi = {
  getKesWithdrawals: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<KesWithdrawal[]> & { pagination: Pagination }> => {
    const response = await adminApi.get('/admin/withdrawals/kes', { params });
    return response.data;
  },

  completeWithdrawal: async (
    id: string,
    mpesaReceiptNumber?: string
  ): Promise<ApiResponse<void>> => {
    const response = await adminApi.put(`/admin/withdrawals/${id}/complete`, { mpesaReceiptNumber });
    return response.data;
  },

  rejectWithdrawal: async (
    id: string,
    reason: string
  ): Promise<ApiResponse<void>> => {
    const response = await adminApi.put(`/admin/withdrawals/${id}/reject`, { reason });
    return response.data;
  },
};

export const adminRatesApi = {
  getAll: async (): Promise<ApiResponse<{ rates: ExchangeRate[] }>> => {
    const response = await adminApi.get('/admin/rates');
    return response.data;
  },

  update: async (
    id: string,
    data: { buyRate?: number; sellRate?: number; isActive?: boolean }
  ): Promise<ApiResponse<{ rate: ExchangeRate }>> => {
    const response = await adminApi.put(`/admin/rates/${id}`, data);
    return response.data;
  },

  create: async (data: {
    pair: string;
    buyRate: number;
    sellRate: number;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<ApiResponse<{ rate: ExchangeRate }>> => {
    const response = await adminApi.post('/admin/rates', data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await adminApi.delete(`/admin/rates/${id}`);
    return response.data;
  },
};

export const adminLiquidityApi = {
  getAll: async (): Promise<ApiResponse<{ balances: LiquidityBalance[] }>> => {
    const response = await adminApi.get('/admin/liquidity');
    return response.data;
  },

  update: async (
    currency: string,
    balance: number,
    notes?: string
  ): Promise<ApiResponse<{ balance: LiquidityBalance }>> => {
    const response = await adminApi.put(`/admin/liquidity/${currency}`, { balance, notes });
    return response.data;
  },
};

export const adminWalletsApi = {
  getAll: async (): Promise<ApiResponse<{ wallets: Wallet[] }>> => {
    const response = await adminApi.get('/admin/wallets');
    return response.data;
  },

  create: async (data: {
    currency: string;
    network: string;
    address: string;
    label?: string
  }): Promise<ApiResponse<{ wallet: Wallet }>> => {
    const response = await adminApi.post('/admin/wallets', data);
    return response.data;
  },

  update: async (
    id: string,
    data: { isActive?: boolean; label?: string }
  ): Promise<ApiResponse<{ wallet: Wallet }>> => {
    const response = await adminApi.put(`/admin/wallets/${id}`, data);
    return response.data;
  },
};

// M-Pesa Admin API
export const adminMpesaApi = {
  // Get cached M-Pesa balance
  getBalance: async (): Promise<ApiResponse<MpesaBalance>> => {
    const response = await adminApi.get('/admin/mpesa/balance');
    return response.data;
  },

  // Trigger balance refresh (async)
  refreshBalance: async (): Promise<ApiResponse<{ conversationId: string }>> => {
    const response = await adminApi.post('/admin/mpesa/balance/refresh');
    return response.data;
  },

  // Initiate B2C payment
  initiateB2CPayment: async (
    data: B2CPaymentRequest
  ): Promise<ApiResponse<{ conversationId: string; originatorConversationId: string }>> => {
    const response = await adminApi.post('/admin/mpesa/b2c', data);
    return response.data;
  },

  // Get transaction history
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<ApiResponse<MpesaTransaction[]> & { pagination: Pagination }> => {
    const response = await adminApi.get('/admin/mpesa/transactions', { params });
    return response.data;
  },

  // Get single transaction
  getTransaction: async (id: string): Promise<ApiResponse<{ transaction: MpesaTransaction }>> => {
    const response = await adminApi.get(`/admin/mpesa/transactions/${id}`);
    return response.data;
  },

  // Initiate transaction reversal
  initiateReversal: async (
    transactionId: string,
    amount: number,
    remarks?: string
  ): Promise<ApiResponse<{ conversationId: string; originatorConversationId: string }>> => {
    const response = await adminApi.post('/admin/mpesa/reversal', {
      transactionId,
      amount,
      remarks,
    });
    return response.data;
  },
};

// Balance Transactions Admin API (for reconciliation)
export interface PendingBalanceTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ORDER_PAYMENT' | 'ORDER_REFUND' | 'ADJUSTMENT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reference: string | null;
  phoneNumber: string | null;
  description: string | null;
  createdAt: string;
  userBalance: {
    user: {
      email: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    };
  };
}

export const adminBalanceApi = {
  // Get pending balance transactions
  getPendingTransactions: async (): Promise<ApiResponse<{ transactions: PendingBalanceTransaction[] }>> => {
    const response = await adminApi.get('/admin/balance/transactions/pending');
    return response.data;
  },

  // Complete a pending balance transaction
  completeTransaction: async (
    id: string,
    mpesaReceiptNumber?: string
  ): Promise<ApiResponse<{ transaction: PendingBalanceTransaction }>> => {
    const response = await adminApi.post(`/admin/balance/transactions/${id}/complete`, {
      mpesaReceiptNumber,
    });
    return response.data;
  },
};

// TRON/USDT API Types
export interface TronWalletSummary {
  hotWallet: string;
  network: string;
  balances: {
    trx: number;
    usdt: number;
  };
  today: {
    deposits: { count: number; amount: number };
    withdrawals: { count: number; amount: number };
  };
}

export interface CryptoTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  currency: string;
  network: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  fee: string | null;
  blockNumber: string | null;
  confirmations: number;
  orderId: string | null;
  createdAt: string;
  confirmedAt: string | null;
  notes: string | null;
  order?: { orderNumber: string } | null;
}

// TRON Admin API
export const adminTronApi = {
  // Get wallet summary
  getWalletSummary: async (): Promise<ApiResponse<TronWalletSummary>> => {
    const response = await adminApi.get('/admin/tron/wallet');
    return response.data;
  },

  // Get transactions
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: 'DEPOSIT' | 'WITHDRAWAL';
    status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
  }): Promise<ApiResponse<CryptoTransaction[]> & { pagination: any }> => {
    const response = await adminApi.get('/admin/tron/transactions', { params });
    return response.data;
  },

  // Check for new deposits
  checkDeposits: async (): Promise<ApiResponse<{ newDeposits: number }>> => {
    const response = await adminApi.post('/admin/tron/check-deposits');
    return response.data;
  },

  // Send USDT
  sendUsdt: async (
    toAddress: string,
    amount: number,
    orderId?: string
  ): Promise<ApiResponse<{ txHash: string }>> => {
    const response = await adminApi.post('/admin/tron/send', {
      toAddress,
      amount,
      orderId,
    });
    return response.data;
  },

  // Validate address
  validateAddress: async (address: string): Promise<ApiResponse<{ address: string; isValid: boolean }>> => {
    const response = await adminApi.get('/admin/tron/validate-address', { params: { address } });
    return response.data;
  },
};
