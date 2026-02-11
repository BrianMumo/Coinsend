import api from './client';
import {
  ApiResponse,
  BalanceWithHistory,
  BalanceTransaction,
  Pagination,
  UsdtBalance,
  UsdtTransaction,
} from '../types';

export interface DepositResponse {
  transactionId: string;
  amount: string;
  checkoutRequestId: string;
  merchantRequestId: string;
}

export interface WithdrawResponse {
  transactionId: string;
  amount: string;
}

export interface UsdtWithdrawResponse {
  transactionId: string;
  amount: string;
  txHash?: string;
  status: string;
}

export interface DepositIntentResponse {
  intentId: string;
  expectedAmount: number;
  depositAddress: string;
  network: string;
  exchangeRate: number;
  estimatedKes: number;
  expiresAt: string;
  expiresIn: string;
}

export interface PendingDepositIntent {
  id: string;
  expectedAmount: number;
  estimatedKes: number;
  exchangeRate: number;
  depositAddress: string;
  network: string;
  expiresAt: string;
  createdAt: string;
}

export interface TransactionStatusResponse {
  id: string;
  status: string;
  isCompleted: boolean;
  amount: string;
  reference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const balanceApi = {
  /**
   * Get user's balance and recent transactions
   */
  getBalance: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<BalanceWithHistory>> => {
    const response = await api.get('/balance', { params });
    return response.data;
  },

  /**
   * Get transaction history with filters
   */
  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<BalanceTransaction[]> & { pagination?: Pagination }> => {
    const response = await api.get('/balance/transactions', { params });
    return response.data;
  },

  /**
   * Initiate M-Pesa deposit to balance
   */
  deposit: async (
    amount: number,
    phoneNumber: string
  ): Promise<ApiResponse<DepositResponse>> => {
    const response = await api.post('/balance/deposit', { amount, phoneNumber });
    return response.data;
  },

  /**
   * Initiate withdrawal to M-Pesa
   */
  withdraw: async (
    amount: number,
    phoneNumber: string
  ): Promise<ApiResponse<WithdrawResponse>> => {
    const response = await api.post('/balance/withdraw', { amount, phoneNumber });
    return response.data;
  },

  /**
   * Check deposit transaction status
   */
  checkDepositStatus: async (
    transactionId: string
  ): Promise<ApiResponse<TransactionStatusResponse>> => {
    const response = await api.get(`/balance/deposit/${transactionId}/status`);
    return response.data;
  },

  /**
   * Check withdrawal transaction status
   */
  checkWithdrawStatus: async (
    transactionId: string
  ): Promise<ApiResponse<TransactionStatusResponse>> => {
    const response = await api.get(`/balance/withdraw/${transactionId}/status`);
    return response.data;
  },

  // ============ USDT METHODS ============

  /**
   * Get USDT balance and deposit address
   */
  getUsdtBalance: async (): Promise<ApiResponse<UsdtBalance>> => {
    const response = await api.get('/balance/usdt');
    return response.data;
  },

  /**
   * Get USDT transaction history
   */
  getUsdtTransactions: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<UsdtTransaction[]> & { pagination?: Pagination }> => {
    const response = await api.get('/balance/usdt/transactions', { params });
    return response.data;
  },

  /**
   * Withdraw USDT to external wallet
   */
  withdrawUsdt: async (
    amount: number,
    walletAddress: string
  ): Promise<ApiResponse<UsdtWithdrawResponse>> => {
    const response = await api.post('/balance/usdt/withdraw', { amount, walletAddress });
    return response.data;
  },

  /**
   * Create USDT deposit intent (tells system how much USDT you're sending)
   */
  createDepositIntent: async (
    amount: number
  ): Promise<ApiResponse<DepositIntentResponse>> => {
    const response = await api.post('/balance/usdt/deposit-intent', { amount });
    return response.data;
  },

  /**
   * Get pending USDT deposit intent
   */
  getDepositIntent: async (): Promise<ApiResponse<PendingDepositIntent | null>> => {
    const response = await api.get('/balance/usdt/deposit-intent');
    return response.data;
  },
};
