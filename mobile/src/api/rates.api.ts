import api from './client';
import { ApiResponse, ExchangeRate } from '../types';

interface CalculateResponse {
  sourceAmount: number;
  destinationAmount: number;
  rate: number;
  pair: string;
}

export const ratesApi = {
  getAll: async (): Promise<ApiResponse<{ rates: ExchangeRate[] }>> => {
    const response = await api.get('/rates');
    return response.data;
  },

  calculate: async (params: {
    sourceCurrency: string;
    destinationCurrency: string;
    amount: number;
    direction: 'buy' | 'sell';
  }): Promise<ApiResponse<CalculateResponse>> => {
    const response = await api.post('/rates/calculate', params);
    return response.data;
  },
};
