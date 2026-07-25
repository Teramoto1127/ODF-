// src/lib/AuthContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { fetchMe, loginUser, logoutUser, registerUser } from './api';
import type { ApiUser, MigratePayload } from './api';

interface AuthContextValue {
  user: ApiUser | null;
  /** 初回起動時に /api/me でCookieの有効性を確認している間 true。ログイン画面のちらつき防止用 */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, migrate?: MigratePayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 未ログインの場合は /api/me が401を返すだけなので、これはエラー扱いにしない。
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginUser(email, password);
    setUser(u);
  }, []);

  const register = useCallback(
    async (email: string, password: string, migrate?: MigratePayload) => {
      const u = await registerUser(email, password, migrate);
      setUser(u);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}