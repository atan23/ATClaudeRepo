import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('readwise_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem('readwise_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      localStorage.removeItem('readwise_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (newToken: string) => {
    localStorage.setItem('readwise_token', newToken);
    setToken(newToken);
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      localStorage.removeItem('readwise_token');
      setToken(null);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('readwise_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
