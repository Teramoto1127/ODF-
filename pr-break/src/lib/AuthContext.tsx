import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  fetchMe,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  confirmPasswordReset,
  changePasswordApi,
  deleteAccountApi,
} from './api';
import type { ApiUser, MigratePayload } from './api';

interface AuthContextValue {
  user: ApiUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, migrate?: MigratePayload) => Promise<void>;
  logout: () => Promise<void>;
  requestReset: (email: string) => Promise<void>;
  confirmReset: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  const requestReset = useCallback(async (email: string) => {
    await requestPasswordReset(email);
  }, []);

  const confirmReset = useCallback(async (token: string, newPassword: string) => {
    await confirmPasswordReset(token, newPassword);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await changePasswordApi(currentPassword, newPassword);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountApi();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        requestReset,
        confirmReset,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}