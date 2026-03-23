import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { ContractApi } from '../contract';

describe('ContractApi', () => {
  it('should be defined', () => { expect(ContractApi).toBeDefined(); });

  describe('create', () => {
    it('should call POST /contracts', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'c-1' } });
      (ContractApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await ContractApi.create({ quotation_id: 'q-1' } as any);
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
