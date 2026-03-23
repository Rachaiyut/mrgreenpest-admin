import { describe, it, expect, vi } from 'vitest';
vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { DashboardApi } from '../dashboard';
describe('DashboardApi', () => {
  it('should be defined', () => { expect(DashboardApi).toBeDefined(); });
  describe('getSummary', () => {
    it('should call GET /dashboard', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: { total_customers: 100 } } });
      (DashboardApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await DashboardApi.getSummary();
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
