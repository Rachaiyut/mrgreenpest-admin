import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));
Object.defineProperty(global, 'localStorage', { value: { getItem: vi.fn().mockReturnValue('mock-token'), setItem: vi.fn(), removeItem: vi.fn() } });

import { AssessmentApi } from '../assessment';

describe('AssessmentApi', () => {
  it('should be defined', () => { expect(AssessmentApi).toBeDefined(); });

  describe('getAll', () => {
    it('should call GET /assessments', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
      (AssessmentApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };
      await AssessmentApi.getAll({ page: 1, limit: 10 } as any);
      expect(mockGet).toHaveBeenCalled();
    });
  });
});
