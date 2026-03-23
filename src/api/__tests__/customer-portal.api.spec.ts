import { describe, it, expect, vi } from 'vitest';
vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { CustomerPortalApi } from '../customer-portal';
describe('CustomerPortalApi', () => {
  it('should be defined', () => { expect(CustomerPortalApi).toBeDefined(); });
  describe('login', () => {
    it('should call POST /customer-portal/login', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { data: { access_token: 'tok' } } });
      (CustomerPortalApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await CustomerPortalApi.login('token-123');
      expect(mockPost).toHaveBeenCalled();
    });
  });
});
