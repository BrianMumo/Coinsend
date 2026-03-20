import api from './client';
import {
  ApiResponse,
  BalanceWithHistory,
  BalanceTransaction,
  Pagination,
  UsdtBalance,
} from '../types';

export interface KesWithdrawResponse {
  transactionId: string;
  usdtAmount: string;
  kesAmount: string;
  rate: number;
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

export interface VerifyDepositResponse {
  usdtAmount: number;
  kesAmount: number;
  txHash: string;
}

export const balanceApi = {
  getBalance: async (params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<BalanceWithHistory>> => {
    const response = await api.get('/balance', { params });
    return response.data;
  },

  getTransactions: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<ApiResponse<BalanceTransaction[]> & { pagination?: Pagination }> => {
    const response = await api.get('/balance/transactions', { params });
    return response.data;
  },

  withdrawToKes: async (
    amount: number,
    phoneNumber: string
  ): Promise<ApiResponse<KesWithdrawResponse>> => {
    const response = await api.post('/balance/withdraw-kes', { amount, phoneNumber });
    return response.data;
  },

  getUsdtBalance: async (): Promise<ApiResponse<UsdtBalance>> => {
    const response = await api.get('/balance/usdt');
    return response.data;
  },

  createDepositIntent: async (
    amount: number
  ): Promise<ApiResponse<DepositIntentResponse>> => {
    const response = await api.post('/balance/usdt/deposit-intent', { amount });
    return response.data;
  },

  verifyDeposit: async (
    txHash: string
  ): Promise<ApiResponse<VerifyDepositResponse>> => {
    const response = await api.post('/balance/usdt/verify-deposit', { txHash });
    return response.data;
  },
};
