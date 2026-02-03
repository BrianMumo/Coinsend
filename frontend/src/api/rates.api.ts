import api from './client';
import { ApiResponse, ExchangeRate } from '../types';

export interface CalculateRateData {
  sourceCurrency: string;
  destinationCurrency: string;
  amount: number;
  direction: 'buy' | 'sell';
}

export interface CalculateRateResponse {
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount: number;
  exchangeRate: number;
  fee: number;
}

export const ratesApi = {
  getAll: async (): Promise<ApiResponse<{ rates: ExchangeRate[] }>> => {
    const response = await api.get('/rates');
    return response.data;
  },

  getByPair: async (pair: string): Promise<ApiResponse<{ rate: ExchangeRate }>> => {
    const response = await api.get(`/rates/${pair}`);
    return response.data;
  },

  calculate: async (data: CalculateRateData): Promise<ApiResponse<CalculateRateResponse>> => {
    const response = await api.post('/rates/calculate', data);
    return response.data;
  },
};
