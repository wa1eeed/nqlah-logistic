import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getMockResponse, DEV_BYPASS_TOKEN } from '@naqla/shared-utils';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('naqla_access_token');
    // Don't attach DEV_BYPASS_TOKEN as Authorization — it's not a real JWT
    // and the API rejects it with "session invalid", trapping the user. The
    // response interceptor handles the 401 by clearing + redirecting.
    if (token && token !== DEV_BYPASS_TOKEN) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function clearAuthAndRedirect() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('naqla_access_token');
    localStorage.removeItem('naqla_refresh_token');
    localStorage.removeItem('naqla-admin-auth');
  } catch { /* ignore */ }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Single-flight token refresh. When several requests 401 at once — e.g. SWR
// revalidates every mounted key on window refocus after the 15-minute access
// token has expired — they must share ONE refresh call. Otherwise each sends
// the same refresh token, the first rotates it, and the rest look like token
// reuse, which makes the API revoke the whole session and force a logout.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('naqla_refresh_token')
      : null;
    if (!refreshToken || refreshToken === DEV_BYPASS_TOKEN) return null;
    try {
      const r = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
      const data = r.data?.data;
      if (data?.accessToken) {
        localStorage.setItem('naqla_access_token', data.accessToken);
        localStorage.setItem('naqla_refresh_token', data.refreshToken);
        return data.accessToken as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ⚠️ TEMP DEV INTERCEPTOR — falls back to mock data when API is unreachable
// or returns an error, so every dashboard stays browsable while real auth
// is being fixed. Normal 401 → refresh flow is preserved for real tokens.
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = config?.url ?? '';
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('naqla_access_token') : null;
    const isDevToken = token === DEV_BYPASS_TOKEN;
    const isAuthEndpoint = url.includes('/auth/');

    // 401 on a non-auth endpoint — try a single-flight refresh before giving
    // up (skip for dev-bypass tokens to avoid loops).
    if (!isDevToken && err.response?.status === 401 && !isAuthEndpoint) {
      if (!config._retry) {
        config._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      }
      clearAuthAndRedirect();
      return Promise.reject(new Error('الجلسة منتهية — يُعاد توجيهك لصفحة الدخول'));
    }

    // Mock fallback — GET only. Mutations (POST/PUT/DELETE/PATCH) must
    // surface real errors so failed create/update/delete operations don't
    // pretend to succeed via mock data.
    const method = (config?.method ?? 'get').toLowerCase();
    if (method !== 'get') {
      if (!err.response) {
        return Promise.reject(new Error(`الـ API غير متاح على ${API_URL}. تأكّد أن الـ backend شغّال.`));
      }
      const responseData = err.response.data as { error?: { message?: string }; message?: string } | undefined;
      const msg = responseData?.error?.message ?? responseData?.message ?? `الخادم رفض الطلب (HTTP ${err.response.status})`;
      const augmented = new Error(msg) as Error & { status?: number; response?: typeof err.response };
      augmented.status = err.response.status;
      augmented.response = err.response;
      return Promise.reject(augmented);
    }

    const mock = getMockResponse(url);
    if (mock !== null) {
      // eslint-disable-next-line no-console
      console.warn(
        `[mock] ${config?.method?.toUpperCase() ?? 'GET'} ${url} (${err.response?.status ?? 'offline'})`,
      );
      return Promise.resolve({
        data: { success: true, data: mock },
        status: 200,
        statusText: 'OK (mock)',
        headers: {},
        config,
      });
    }

    return Promise.reject(err);
  },
);

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await api.get(url);
  return res.data?.data as T;
}
