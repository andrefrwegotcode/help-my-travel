import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import type { User, LoginDto, RegisterDto } from '@helpmytravel/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateLanguage: (language: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const { data } = await api.get('/users/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  login: async (dto) => {
    const { data } = await api.post('/auth/login', dto);
    await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
    set({ user: data.user, isAuthenticated: true });
  },

  register: async (dto) => {
    const { data } = await api.post('/auth/register', dto);
    await SecureStore.setItemAsync('accessToken', data.tokens.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.tokens.refreshToken);
    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  updateLanguage: async (language) => {
    await api.put('/users/me', { language });
    const user = get().user;
    if (user) set({ user: { ...user, language } });
  },
}));
