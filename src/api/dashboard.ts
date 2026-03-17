import { AuthService } from './auth';

export interface DashboardData {
  kpi: {
    revenue: number;
    outstanding_amount: number;
    outstanding_count: number;
    active_contracts: number;
    job_completion_rate: number;
    total_jobs: number;
    completed_jobs: number;
    new_customers: number;
  };
  pipeline: {
    assessments: { total: number; completed: number };
    quotations: { total: number; signed: number; pending: number; approved: number; cancelled: number };
    contracts: { total: number; active: number };
    conversion: { assessment_to_quotation: number; quotation_to_signed: number };
  };
  todayJobs: any[];
  upcomingJobs: any[];
  overdueInvoices: {
    items: any[];
    aging: { current: number; '1-30': number; '31-60': number; '61-90': number; '90+': number };
  };
  lowStockItems: any[];
  expiringContracts: any[];
  revenueByMonth: { month: string; revenue: number }[];
  jobsByStatus: { status: string; count: number }[];
  recentActivities: any[];
  pendingActions: {
    total: number;
    items: { key: string; label: string; count: number; color: string; path: string }[];
  };
  comparison: {
    revenue: { current: number; previous: number; change: number; percent: number };
    jobs: { current: number; previous: number; change: number; percent: number };
    completed_jobs: { current: number; previous: number; change: number; percent: number };
    new_customers: { current: number; previous: number; change: number; percent: number };
    new_contracts: { current: number; previous: number; change: number; percent: number };
  };
}

class DashboardApiService extends AuthService {
  protected path = '/dashboard';

  async getSummary(range: 'today' | 'week' | 'month' | 'quarter' = 'month'): Promise<DashboardData> {
    const res = await this.http.get<DashboardData>(this.path, { params: { range } });
    return (res.data as any)?.data || res.data;
  }
}

export const DashboardApi = new DashboardApiService();
