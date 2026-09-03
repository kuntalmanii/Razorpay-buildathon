'use client';

/**
 * contexts/auth-context.tsx
 *
 * Global AuthContext providing the authenticated user, loading state, and
 * login/logout actions to all components in the React tree.
 *
 * Session bootstrap: on mount, calls GET /api/auth/me to rehydrate from
 * the httpOnly cookie. If the cookie is absent/expired, user = null.
 *
 * Usage:
 *   const { user, isAdmin, login, logout, isLoading } = useAuth();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AuthUser,
  getMe,
  login as loginApi,
  logout as logoutApi,
  signup as signupApi,
} from '@/lib/auth-client';

interface AuthContextValue {
  /** Currently authenticated user, or null if unauthenticated */
  user: AuthUser | null;
  /** True while the initial session check is running */
  isLoading: boolean;
  /** True once the initial session check has finished */
  isReady: boolean;
  /** Convenience: true if user.role === 'admin' */
  isAdmin: boolean;
  /**
   * Authenticate with email + password.
   * Sets user state and cookie via httpOnly response cookie.
   */
  login: (email: string, password: string) => Promise<void>;
  /**
   * Register a new account.
   * Automatically logs the user in after successful registration.
   */
  signup: (name: string, email: string, password: string) => Promise<void>;
  /** Clear session and remove the auth cookie. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Rehydrate session from the httpOnly cookie on mount
  useEffect(() => {
    getMe()
      .then(({ user: me }) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => {
        setIsLoading(false);
        setIsReady(true);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: me } = await loginApi(email, password);
    setUser(me);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { user: me } = await signupApi(name, email, password);
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isReady,
    isAdmin: user?.role === 'admin',
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
