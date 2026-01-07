import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token =
      (typeof localStorage !== 'undefined' &&
        (localStorage.getItem('authToken') || localStorage.getItem('token'))) ||
      '';
    if (token) {
      const headers = (config.headers ?? {}) as Record<string, string>;
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers as any;
    }
  } catch {}
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default client;
