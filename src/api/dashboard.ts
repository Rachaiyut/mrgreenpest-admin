import { AuthService } from './auth';

interface DashboardJobItem {
  id: string;
  code: string;
  customer_name: string;
  appointment_date: string;
  start_date: string;
  status: string;
  primary_tech_name?: string;
  vehicle_name?: string;
}

interface DashboardInvoiceItem {
  id: string;
  code: string;
  customer_name: string;
  due_date: string;
  total_amount: number;
  days_overdue: number;
}

interface DashboardStockItem {
  id: string;
  product_name: string;
  warehouse_name: string;
  current_qty: number;
  min_stock: number;
}

interface DashboardContractItem {
  id: string;
  code: string;
  customer_name: string;
  end_date: string;
  days_remaining: number;
}

interface DashboardActivityItem {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_name?: string;
}

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
  todayJobs: DashboardJobItem[];
  upcomingJobs: DashboardJobItem[];
  overdueInvoices: {
    items: DashboardInvoiceItem[];
    aging: { current: number; '1-30': number; '31-60': number; '61-90': number; '90+': number };
  };
  lowStockItems: DashboardStockItem[];
  expiringContracts: DashboardContractItem[];
  revenueByMonth: { month: string; revenue: number }[];
  jobsByStatus: { status: string; count: number }[];
  recentActivities: DashboardActivityItem[];
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
    const body = res.data as unknown as { data?: DashboardData };
    return body?.data || res.data;
  }
}

export const DashboardApi = new DashboardApiService();
