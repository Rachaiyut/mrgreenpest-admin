export const API_CONFIG = {
  baseUrl:
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env?.VITE_API_BASE_URL) ||
    (typeof process !== 'undefined'
      ? (process.env as any)?.API_BASE_URL
      : '') ||
    '',
  timeout: 30000,
} as const;
