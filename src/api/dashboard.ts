import { AuthService } from './auth';

export interface DashboardJobItem {
  id: string;
  status: string;
  appointment_date: string;
  start_date: string;
  end_date?: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  remark?: string | null;
  customer_id?: string;
  service_system?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  address?: string | null;
}

export interface DashboardInvoiceItem {
  id: string;
  code: string;
  customer_name: string;
  status: string;
  total: number | string;
  paid_amount: number | string | null;
  due_at: string;
  days_overdue: number;
}

export interface DashboardStockItem {
  id: string;
  code: string;
  name: string;
  min_stock: number;
  unit_name?: string | null;
  total_stock: number | string;
}

export interface DashboardContractItem {
  id: string;
  code: string;
  customer_name: string;
  end_date: string;
  total_amount: number | string;
  status: string;
  days_remaining: number;
}

export interface DashboardActivityItem {
  type: string;
  ref_code: string;
  status: string;
  created_at: string;
}

export interface DashboardPendingAction {
  key: string;
  label: string;
  count: number;
  color: string;
  path: string;
}

export interface DashboardComparison {
  current: number;
  previous: number;
  change: number;
  percent: number;
}

export interface DashboardPaymentMethodItem {
  method: string;
  count: number;
  amount: number;
}

export interface DashboardTodayPayments {
  total_count: number;
  total_amount: number;
  items: DashboardPaymentMethodItem[];
}

export interface DashboardLongTermAgingBucket {
  count: number;
  amount: number;
}

export interface DashboardLongTermAging {
  bucket_91_180: DashboardLongTermAgingBucket;
  bucket_181_365: DashboardLongTermAgingBucket;
  bucket_365_plus: DashboardLongTermAgingBucket;
}

export interface DashboardCancelledJob {
  id: string;
  status: string;
  appointment_date: string;
  updated_at: string;
  remark?: string | null;
  service_system?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  address?: string | null;
}

export interface DashboardMonthlyPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
  cumulative_income: number;
  cumulative_expense: number;
}

export interface DashboardMonthlyIncomeExpense {
  thisMonth: { income: number; expense: number; net: number };
  incomeDelta: DashboardComparison;
  expenseDelta: DashboardComparison;
  series: DashboardMonthlyPoint[];
}

export type VehicleState = 'IDLE' | 'WAITING' | 'WORKING' | 'DONE';

export interface DashboardVehicleJob {
  id: string;
  status: string;
  actual_start_time: string | null;
  service_system: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
}

export interface DashboardVehicleToday {
  id: string;
  registration: string;
  brand: string;
  model: string;
  color: string;
  vehicleStatus: string;
  state: VehicleState;
  counts: {
    total: number;
    pending: number;
    in_progress: number;
    complete: number;
    cancelled: number;
  };
  jobs: DashboardVehicleJob[];
}

export interface DashboardAcquisitionPoint {
  month: string;
  new_count: number;
  renewal_count: number;
  cumulative_new: number;
  cumulative_renewal: number;
}

export interface DashboardCustomerAcquisition {
  thisMonth: { new_count: number; renewal_count: number; total: number };
  series: DashboardAcquisitionPoint[];
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
    longTermAging: DashboardLongTermAging;
  };
  lowStockItems: DashboardStockItem[];
  expiringContracts: DashboardContractItem[];
  revenueByMonth: { month: string; revenue: number }[];
  jobsByStatus: { status: string; count: number }[];
  recentActivities: DashboardActivityItem[];
  pendingActions: {
    total: number;
    items: DashboardPendingAction[];
  };
  comparison: {
    revenue: DashboardComparison;
    jobs: DashboardComparison;
    completed_jobs: DashboardComparison;
    new_customers: DashboardComparison;
    new_contracts: DashboardComparison;
  };
  todayPayments: DashboardTodayPayments;
  cancelledJobsToday: DashboardCancelledJob[];
  monthlyIncomeExpense: DashboardMonthlyIncomeExpense;
  vehiclesToday: DashboardVehicleToday[];
  customerAcquisition: DashboardCustomerAcquisition;
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
