import { useEffect } from 'react';
import { secureStorage } from '../utils/secureStorage';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await secureStorage.getToken();
        const user = await secureStorage.getUser();
        if (token && user) {
          setAuth(token, user);
        }
      } catch {
        // SecureStore unavailable — silent fail, user will see login screen
      } finally {
        setBootstrapping(false);
      }
    }
    bootstrap();
  }, []);
}
