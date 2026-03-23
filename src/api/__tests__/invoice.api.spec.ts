import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { InvoiceApi } from '../invoice';

describe('InvoiceApi', () => {
  it('should be defined', () => { expect(InvoiceApi).toBeDefined(); });

  describe('create', () => {
    it('should call POST /invoices', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'inv-1' } });
      (InvoiceApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await InvoiceApi.create({ contract_id: 'c-1', amount: 50000 } as any);
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
