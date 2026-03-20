import api from './client';
import { ApiResponse, User } from '../types';

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  getProfile: async (): Promise<ApiResponse<User & { orderCount?: number }>> => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (
    data: UpdateProfileData
  ): Promise<ApiResponse<User>> => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  changePassword: async (
    data: ChangePasswordData
  ): Promise<ApiResponse<void>> => {
    const response = await api.put('/users/password', data);
    return response.data;
  },
};
