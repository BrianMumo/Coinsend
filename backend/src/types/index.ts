import { OrderType, OrderStatus, KycStatus, AdminRole } from '@prisma/client';

// User types
export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    country: string;
    kycStatus: KycStatus;
  };
  token: string;
}

// Admin types
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: AdminRole;
  };
  token: string;
}

// Order types
export interface CreateOrderRequest {
  orderType: OrderType;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  payoutDestination?: string; // Phone number, wallet address, or bank account
  recipientName?: string;
  recipientPhone?: string;
  recipientBank?: string;
  recipientAccount?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  processingNotes?: string;
  payoutReference?: string;
}

// Rate types
export interface CalculateRateRequest {
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

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
