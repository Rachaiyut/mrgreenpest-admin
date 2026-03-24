import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '@/src/constants/config';

const PORTAL_STORAGE_KEYS = {
  TOKEN: 'portal_token',
  CUSTOMER: 'portal_customer',
};

class CustomerPortalApi {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    this.http.interceptors.request.use((config) => {
      const token = localStorage.getItem(PORTAL_STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      return config;
    });
  }

  async verifyToken(token: string) {
    const res = await this.http.post('/customer-portal/verify', { token });
    return res.data;
  }

  async getQuotations() {
    const res = await this.http.get('/customer-portal/quotations');
    return res.data;
  }

  async getContracts() {
    const res = await this.http.get('/customer-portal/contracts');
    return res.data;
  }

  async getReceipts() {
    const res = await this.http.get('/customer-portal/receipts');
    return res.data;
  }

  // Signing endpoints (public - no auth needed)
  async getSigningData(token: string) {
    const res = await this.http.get(`/customer-portal/signing/${token}`);
    return res.data;
  }

  async submitSignature(token: string, data: { signer_name: string; signature: string }) {
    const res = await this.http.post(`/customer-portal/signing/${token}/sign`, data);
    return res.data;
  }

  // Admin endpoint - generate signing link
  async generateSigningLink(customerId: string, quotationId: string, expiresHours: number = 72) {
    const res = await this.http.post(`/customer/${customerId}/quotation/${quotationId}/signing-link`, { expires_hours: expiresHours });
    return res.data;
  }

  async getServiceReports() {
    const res = await this.http.get('/customer-portal/service-reports');
    return res.data;
  }

  async downloadPdf(type: 'quotations' | 'contracts' | 'receipts' | 'service-reports', id: string): Promise<Blob> {
    const res = await this.http.get(`/customer-portal/${type}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const portalApi = new CustomerPortalApi();
export { PORTAL_STORAGE_KEYS };
