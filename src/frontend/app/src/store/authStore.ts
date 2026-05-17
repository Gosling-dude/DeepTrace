/**
 * Auth store using Zustand.
 * Manages user state, login/logout, and profile data.
 */

import { create } from 'zustand';
import { authApi, setTokens, clearTokens, getAccessToken } from '../api/client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ isInitialized: true, isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await authApi.getProfile();
      set({ user, isAuthenticated: true, isInitialized: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.register(email, password, fullName);
      setTokens(tokens.access_token, tokens.refresh_token);
      const user = await authApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    try {
      const user = await authApi.getProfile();
      set({ user });
    } catch {
      // Silent fail
    }
  },
}));
