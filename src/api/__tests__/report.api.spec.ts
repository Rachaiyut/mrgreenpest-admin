import { describe, it, expect, vi } from 'vitest';
vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('t'), setItem: vi.fn(), removeItem: vi.fn() } });

import { ReportApi } from '../report';
describe('ReportApi', () => {
  it('should be defined', () => { expect(ReportApi).toBeDefined(); });
  describe('getSalesSummary', () => {
    it('should call GET /reports/sales', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: {} } });
      (ReportApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await ReportApi.getSalesSummary({} as any);
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
