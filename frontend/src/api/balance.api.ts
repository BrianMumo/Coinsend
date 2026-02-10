import api from './client';
import {
  ApiResponse,
  BalanceWithHistory,
  BalanceTransaction,
  Pagination,
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
};
