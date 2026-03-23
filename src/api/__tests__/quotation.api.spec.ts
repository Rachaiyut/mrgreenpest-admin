import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the config before importing
vi.mock('@/src/constants/config', () => ({
  API_CONFIG: { baseUrl: 'http://localhost:3000', timeout: 5000 },
}));

vi.mock('@/src/constants', () => ({
  STORAGE_KEYS: { TOKEN: 'access_token', USER_PROFILE: 'user_profile' },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue('mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import { QuotationApi } from '../quotation';

describe('QuotationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(QuotationApi).toBeDefined();
  });

  it('should have path /quotations', () => {
    expect((QuotationApi as any).path).toBe('/quotations');
  });

  describe('getAll', () => {
    it('should call GET /quotations with params', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
      (QuotationApi as any).http = { get: mockGet, post: vi.fn(), patch: vi.fn(), delete: vi.fn(), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      await QuotationApi.getAll({ page: 1, limit: 10 } as any);

      expect(mockGet).toHaveBeenCalledWith('/quotations', { params: { page: 1, limit: 10 } });
    });
  });

  describe('getById', () => {
    it('should call GET /quotations/:id', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: { id: 'quot-1' } });
      (QuotationApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      await QuotationApi.getById('quot-1');

      expect(mockGet).toHaveBeenCalledWith('/quotations/quot-1');
    });
  });

  describe('create', () => {
    it('should call POST /quotations', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'quot-new' } });
      (QuotationApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      const data = { customer_id: 'cust-1', total_price: 50000 } as any;
      await QuotationApi.create(data);

      expect(mockPost).toHaveBeenCalledWith('/quotations', data);
    });
  });

  describe('revise', () => {
    it('should call POST /quotations/:id/revise', async () => {
      const mockPost = vi.fn().mockResolvedValue({ data: { id: 'quot-revised' } });
      (QuotationApi as any).http = { post: mockPost, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      const data = { customer_id: 'cust-1' } as any;
      await QuotationApi.revise('quot-1', data);

      expect(mockPost).toHaveBeenCalledWith('/quotations/quot-1/revise', data);
    });
  });

  describe('getPDF', () => {
    it('should call GET /quotations/:id/pdf as blob', async () => {
      const mockGet = vi.fn().mockResolvedValue({ data: new Blob() });
      (QuotationApi as any).http = { get: mockGet, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } };

      await QuotationApi.getPDF('quot-1');

      expect(mockGet).toHaveBeenCalledWith('/quotations/quot-1/pdf', { responseType: 'blob' });
    });
  });
});
