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
    return (res.data as any)?.data || res.data;
  }

  async getContractExpiration(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/contract-expiration`, { params: filter });
    return (res.data as any)?.data || res.data;
  }

  async getTechnicianPerformance(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/technician-performance`, { params: filter });
    return (res.data as any)?.data || res.data;
  }

  async getInventoryUsage(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/inventory-usage`, { params: filter });
    return (res.data as any)?.data || res.data;
  }

  async getSalesPipeline(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/sales-pipeline`, { params: filter });
    return (res.data as any)?.data || res.data;
  }

  async getProfitLoss(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/profit-loss`, { params: filter });
    return (res.data as any)?.data || res.data;
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
