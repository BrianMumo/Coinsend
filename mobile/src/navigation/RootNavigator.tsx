import React from 'react';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <MainTabs /> : <AuthStack />;
}
