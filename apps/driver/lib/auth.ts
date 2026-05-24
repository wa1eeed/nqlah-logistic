import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, apiError } from './api';

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  companyId: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phoneOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  boot: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  boot: async () => {
    try {
      const token = await SecureStore.getItemAsync('naqla_driver_token');
      if (!token) { set({ isLoading: false }); return; }
      const raw = await SecureStore.getItemAsync('naqla_driver_user');
      if (raw) set({ user: JSON.parse(raw) });
    } catch {}
    set({ isLoading: false });
  },

  login: async (phoneOrEmail, password) => {
    const { data } = await api.post('/auth/login', { phoneOrEmail, password });
    const payload = data?.data;
    if (!payload?.accessToken) throw new Error('استجابة غير صالحة من الخادم');
    await SecureStore.setItemAsync('naqla_driver_token',   payload.accessToken);
    await SecureStore.setItemAsync('naqla_driver_refresh', payload.refreshToken);
    await SecureStore.setItemAsync('naqla_driver_user',    JSON.stringify(payload.user));
    set({ user: payload.user });
  },

  logout: async () => {
    try {
      const refresh = await SecureStore.getItemAsync('naqla_driver_refresh');
      if (refresh) await api.post('/auth/logout', { refreshToken: refresh }).catch(() => {});
    } finally {
      await SecureStore.deleteItemAsync('naqla_driver_token');
      await SecureStore.deleteItemAsync('naqla_driver_refresh');
      await SecureStore.deleteItemAsync('naqla_driver_user');
      set({ user: null });
    }
  },
}));
