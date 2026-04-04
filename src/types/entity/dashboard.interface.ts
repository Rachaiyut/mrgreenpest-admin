export interface DashboardStats {
  total_customers: number;
  total_contracts: number;
  total_active_contracts: number;
  total_revenue: number;
  total_pending_invoices: number;
  total_overdue_invoices: number;
  total_jobs_today: number;
  total_jobs_completed_today: number;
}

export interface DashboardUpcoming {
  todayJobs: DashboardJob[];
  upcomingJobs: DashboardJob[];
  lowStockItems: DashboardStockItem[];
  expiringContracts: DashboardContract[];
  overdueInvoices: {
    total: number;
    totalAmount: number;
    items: DashboardInvoice[];
  };
  recentActivities: DashboardActivity[];
}

export interface DashboardJob {
  id: string;
  code: string;
  customer_name: string;
  appointment_date: string;
  start_date: string;
  status: string;
  primary_tech_name?: string;
  vehicle_name?: string;
}

export interface DashboardStockItem {
  id: string;
  product_name: string;
  warehouse_name: string;
  current_qty: number;
  min_stock: number;
}

export interface DashboardContract {
  id: string;
  code: string;
  customer_name: string;
  end_date: string;
  days_remaining: number;
}

export interface DashboardInvoice {
  id: string;
  code: string;
  customer_name: string;
  due_date: string;
  total_amount: number;
  days_overdue: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  created_at: string;
  user_name?: string;
}
