import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../utils/constants';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // No window.location in React Native — store logout triggers navigation via RootNavigator
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? error.message ?? 'An error occurred';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export default api;
