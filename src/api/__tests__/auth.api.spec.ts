import { describe, it, expect, vi } from 'vitest';
vi.mock('@/src/constants/config', () => ({ API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 } }));
vi.mock('@/src/constants', () => ({ STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' } }));

const localStorageMock = { getItem: vi.fn().mockReturnValue('test-token'), setItem: vi.fn(), removeItem: vi.fn() };
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { AuthService } from '../auth';

describe('AuthService', () => {
  it('should include Authorization header from localStorage', () => {
    const service = new (AuthService as any)();
    const token = service.getAccessToken();
    expect(localStorageMock.getItem).toHaveBeenCalledWith('access_token');
    expect(token).toBe('test-token');
  });
});
