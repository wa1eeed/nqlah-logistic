import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true, timeout: 20000 });

const TOKEN_KEY = 'naqla_driver_token';
const REFRESH_KEY = 'naqla_driver_refresh';
const AUTH_KEY = 'naqla-driver-auth';

api.interceptors.request.use((c) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) c.headers.Authorization = `Bearer ${token}`;
  }
  return c;
});

function clearAuthAndRedirect() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(AUTH_KEY);
  } catch { /* ignore */ }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Single-flight token refresh. When several requests 401 at once — e.g. SWR
// revalidates every mounted key on window refocus after the short-lived access
// token has expired — they must share ONE refresh call. Otherwise each sends
// the same refresh token, the first rotates it, and the rest look like token
// reuse, which makes the API revoke the whole session and force a logout.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem(REFRESH_KEY)
      : null;
    if (!refreshToken) return null;
    try {
      const r = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
      const data = r.data?.data;
      if (data?.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
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

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');

    // 401 on a non-auth endpoint — try a single-flight refresh before giving up.
    if (err.response?.status === 401 && !isAuthEndpoint) {
      if (!config._retry) {
        config._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
          return api(config);
        }
      }
      clearAuthAndRedirect();
      return Promise.reject(new Error('انتهت الجلسة — يُعاد توجيهك لصفحة الدخول'));
    }

    // Surface a clean message. The backend wraps errors as
    // `{ error: { message } }` or `{ message }`; fall back to the HTTP status.
    if (!err.response) {
      return Promise.reject(new Error(`الـ API غير متاح على ${API_URL}. تأكّد أن الـ backend شغّال.`));
    }
    const status = err.response.status;
    const responseData = err.response.data as { error?: { message?: string }; message?: string } | undefined;
    const msg = responseData?.error?.message ?? responseData?.message ?? `الخادم رفض الطلب (HTTP ${status})`;
    const augmented = new Error(msg) as Error & { status?: number; response?: typeof err.response };
    augmented.status = status;
    augmented.response = err.response;
    return Promise.reject(augmented);
  },
);

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await api.get(url);
  return res.data?.data as T;
}
