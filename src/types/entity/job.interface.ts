import { IBase } from './base.interface';
import { JobMainStatus } from '../enums/job';
import { Customer } from './customer.interface';

export enum ServiceSystem {
  CHEMICAL = 'CHEMICAL',
  PREY = 'PREY',
}

export interface TeamMember {
  id?: string;
  job_id?: string;
  user_id: string;
  check_in?: Date | string;
  check_out?: Date | string;
  created_at?: string;
  updated_at?: string;
}

export interface Job extends IBase {
  customer_id?: string;
  contract_id?: string;
  assessment_id?: string;
  invoice_id?: string;
  primary_tech_id: string;
  vehicle_id: string;
  start_date: Date | string;
  end_date: Date | string;
  status: JobMainStatus | string;
  service_system?: ServiceSystem | string;
  remark?: string;

  // Relations
  customer?: Customer;
  primary_technician?: any;
  job_team_members?: TeamMember[];
  team_member?: TeamMember[]; // Legacy support
  vehicle?: any;
  service_report?: any; // Added for notifications page
}
