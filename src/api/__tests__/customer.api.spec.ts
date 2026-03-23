import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/src/constants/config', () => ({
  API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 },
}));
vi.mock('@/src/constants', () => ({
  STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' },
}));

const localStorageMock = { getItem: vi.fn().mockReturnValue('mock-token'), setItem: vi.fn(), removeItem: vi.fn() };
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { CustomerApi } from '../customer';

describe('CustomerApi', () => {
  it('should be defined', () => {
    expect(CustomerApi).toBeDefined();
  });

  describe('getCustomers', () => {
    it('should call GET /customer', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
      (CustomerApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      await CustomerApi.getCustomers({ page: 1, limit: 10 } as any);

      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('should call POST /customer', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'cust-1' } });
      (CustomerApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      const data = { first_name: 'สมชาย', type: 'PERSONAL' } as any;
      await CustomerApi.createCustomer(data);

      expect(mockPost).toHaveBeenCalled();
    });
  });
});
