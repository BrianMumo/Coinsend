import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const TOKEN_KEY = 'coinsend_auth_token';
const USER_KEY = 'coinsend_auth_user';

export const secureStorage = {
  saveToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),

  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),

  deleteToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),

  saveUser: (user: User) =>
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),

  getUser: async (): Promise<User | null> => {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  deleteUser: () => SecureStore.deleteItemAsync(USER_KEY),

  clearAll: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
