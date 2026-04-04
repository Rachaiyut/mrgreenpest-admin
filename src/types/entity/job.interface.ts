import { IBase } from './base.interface';
import { JobMainStatus } from '../enums/job';
import { Customer } from './customer.interface';
import { ServiceSystem } from '../enums/assessment';
import { ServiceReport } from './service-report.interface';
import { User } from './core.interface';
import { Vehicle } from './inventory.interface';

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

  appointment_date: Date,
  start_date: Date;
  end_date: Date;
  status: JobMainStatus;
  service_system?: ServiceSystem;
  remark?: string;

  // Relations
  customer?: Customer;
  primary_technician?: User;
  job_team_members?: TeamMember[];
  team_member?: TeamMember[];
  vehicle?: Vehicle;
  service_report?: ServiceReport;
}
