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

  // ── New analysis reports ─────────────────────────────────────────────
  async getJobCancellation(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/job-cancellation`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getAssessmentStatus(filter?: ReportFilter & {
    technician_id?: string;
    vehicle_id?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const res = await this.http.get(`${this.path}/assessment-status`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getOverdueJobs(filter?: ReportFilter & {
    technician_id?: string;
    vehicle_id?: string;
    bucket?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const res = await this.http.get(`${this.path}/overdue-jobs`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getContractRenewalStatus(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/contract-renewal-status`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  async getDailyServiceCount(filter?: ReportFilter & {
    technician_id?: string;
    vehicle_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const res = await this.http.get(`${this.path}/daily-service-count`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }

  // ── Phase 2 analysis reports ─────────────────────────────────────
  async getChemicalUsageDaily(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/chemical-usage-daily`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }
  async getDailyTechDeployment(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/daily-tech-deployment`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }
  async getContractRenewalCohort(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/contract-renewal-cohort`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }
  async getServiceTimePerformance(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/service-time-performance`, { params: filter });
    const body = res.data as unknown as { data?: unknown };
    return body?.data || res.data;
  }
  async getTechLeadActivity(filter?: ReportFilter) {
    const res = await this.http.get(`${this.path}/tech-lead-activity`, { params: filter });
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
