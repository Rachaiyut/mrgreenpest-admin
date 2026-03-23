import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { ReceiptApi } from '../receipt';

describe('ReceiptApi', () => {
  it('should be defined', () => { expect(ReceiptApi).toBeDefined(); });

  describe('getAll', () => {
    it('should call GET /receipts', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
      (ReceiptApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await ReceiptApi.getAll({ page: 1, limit: 10 } as any);
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
