import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored JWT token from localStorage
if (typeof window !== 'undefined') {
  adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

export async function adminLogin(email: string, password: string) {
  const res = await adminApi.post('/auth/login', { email, password });
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', res.data.tokens.accessToken);
    localStorage.setItem('admin_refresh', res.data.tokens.refreshToken);
    // Also set cookie so Next.js middleware can protect routes server-side
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `admin_token=${res.data.tokens.accessToken}; path=/; max-age=${maxAge}; SameSite=Strict`;
  }
  return res.data;
}

export async function adminLogout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh');
    // Clear the middleware cookie
    document.cookie = 'admin_token=; path=/; max-age=0; SameSite=Strict';
  }
}
