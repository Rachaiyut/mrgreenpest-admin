import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@/src/test/test-utils';

vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({
  STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' },
  PORTAL_STORAGE_KEYS: { TOKEN: 'portal_token', CUSTOMER: 'portal_customer' },
}));

vi.mock('@/src/api/customer-portal', () => ({
  CustomerPortalApi: {
    verifyToken: vi.fn().mockResolvedValue({ id: 'cust-1', name: 'สมชาย' }),
    login: vi.fn().mockResolvedValue({ data: { access_token: 'new-token' } }),
  },
}));

const localStorageMock: Record<string, string> = {};
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageMock[key] || null),
    setItem: vi.fn((key: string, val: string) => { localStorageMock[key] = val; }),
    removeItem: vi.fn((key: string) => { delete localStorageMock[key]; }),
  },
});

import { PortalProvider, usePortal } from '../PortalContext';

const TestConsumer = () => {
  const ctx = usePortal();
  return (
    <div>
      <span data-testid="authenticated">{ctx.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{ctx.loading ? 'yes' : 'no'}</span>
      <button data-testid="login" onClick={() => ctx.login('test-token')}>Login</button>
      <button data-testid="logout" onClick={() => ctx.logout()}>Logout</button>
    </div>
  );
};

describe('PortalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]);
  });

  it('should handle login and set token', async () => {
    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>
    );
    expect(screen.getByTestId('authenticated')).toBeDefined();
  });

  it('should handle logout and clear storage', async () => {
    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>
    );

    await act(async () => {
      screen.getByTestId('logout').click();
    });

    expect(screen.getByTestId('authenticated').textContent).toBe('no');
  });

  it('should persist session in localStorage', () => {
    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>
    );
    expect(screen.getByTestId('authenticated')).toBeDefined();
  });

  it('should restore session from localStorage', () => {
    localStorageMock['portal_token'] = 'saved-token';
    localStorageMock['portal_customer'] = JSON.stringify({ id: 'c-1', name: 'สมหญิง' });

    render(
      <PortalProvider>
        <TestConsumer />
      </PortalProvider>
    );
    expect(screen.getByTestId('authenticated')).toBeDefined();
  });
});
