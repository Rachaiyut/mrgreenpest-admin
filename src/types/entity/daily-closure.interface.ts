import { IBase } from './base.interface';

export interface DailyJobClosure extends IBase {
  closure_date: string;
  vehicle_id: string;
  primary_tech_id: string;
  day_start_mileage?: number;
  day_end_mileage?: number;
  total_jobs: number;
  completed_jobs: number;
  incomplete_jobs: number;
  has_no_stock_issue: boolean;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  closed_by?: string;
  closed_at?: string;
  created_by: string;
  // Relations
  vehicle?: {
    id: string;
    name: string;
    vehicle?: { vehicle_registration?: string };
  };
  primary_technician?: {
    id: string;
    first_name: string;
    last_name: string;
    nick_name?: string;
  };
  closer?: { id: string; first_name: string; last_name: string };
  members?: DailyJobClosureMember[];
}

export interface DailyJobClosureMember extends IBase {
  daily_job_closure_id: string;
  user_id: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    nick_name?: string;
  };
}

export interface CreateDailyJobClosurePayload {
  closure_date: string;
  vehicle_id: string;
  primary_tech_id: string;
  day_start_mileage?: number;
  notes?: string;
  member_ids?: string[];
}

export interface CloseDailyJobClosurePayload {
  closure_date?: string;
  day_end_mileage?: number;
  has_no_stock_issue?: boolean;
  notes?: string;
}

export interface DailyClosureOverviewItem {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_registration: string;
  primary_tech_name: string;
  total_jobs: number;
  completed_jobs: number;
  incomplete_jobs: number;
  customer_names: string[];
  closure_id: string | null;
  closure_status: 'OPEN' | 'CLOSED' | 'NOT_STARTED';
  has_issue_summary: boolean;
}
