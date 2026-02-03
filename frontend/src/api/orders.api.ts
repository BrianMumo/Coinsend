import api from './client';
import { ApiResponse, Order, OrderType, OrderStatus, PaymentInstructions, Pagination } from '../types';

export interface CreateOrderData {
  orderType: OrderType;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  payoutDestination?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientBank?: string;
  recipientAccount?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: OrderStatus;
  orderType?: OrderType;
}

export const ordersApi = {
  create: async (data: CreateOrderData): Promise<ApiResponse<{ order: Order; paymentInstructions: PaymentInstructions }>> => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getAll: async (params?: OrderListParams): Promise<ApiResponse<Order[]> & { pagination: Pagination }> => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<{ order: Order; paymentInstructions: PaymentInstructions }>> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  submitProof: async (id: string, proofUrl: string, paymentReference?: string): Promise<ApiResponse<{ order: Order }>> => {
    const response = await api.post(`/orders/${id}/proof`, { proofUrl, paymentReference });
    return response.data;
  },

  cancel: async (id: string): Promise<ApiResponse<{ order: Order }>> => {
    const response = await api.post(`/orders/${id}/cancel`);
    return response.data;
  },
};
