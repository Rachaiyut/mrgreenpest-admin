import { AuthService } from './auth';

export interface ReportFilter {
  month?: number;
  year?: number;
  search?: string;
  days?: number;
}

class ReportApiService extends AuthService {
  protected path = '/report';

  async getArAging(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/ar-aging`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getContractExpiration(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/contract-expiration`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getTechnicianPerformance(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/technician-performance`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getInventoryUsage(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/inventory-usage`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getSalesPipeline(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/sales-pipeline`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getProfitLoss(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/profit-loss`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getTaxInvoiceIncome(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/tax-invoice-income`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getDailyCash(filter?: ReportFilter & { account_id?: string }) {
    const res = await this.http.get(`${this.path}/daily-cash`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async downloadExcel(reportType: string, filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/${reportType}/excel`, {
      params: filter,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}-report.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const ReportApi = new ReportApiService();
