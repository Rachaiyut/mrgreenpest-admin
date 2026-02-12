import { User } from './core.interface';
import { JobMainStatus, JobStatus } from '../enums/job';
import { PaymentMethod } from '../enums/financial';
import { Invoice } from './financial.interface';

export interface FieldJobWorkArea {
  id: string;
  name: string;
  service_package: string;
}

export interface ServiceReport {
  id?: string;
  job_id?: string;
  customer_id?: string;
  report_date?: string;
  customer_name?: string;
  is_service_termite?: boolean;
  is_service_ant_roach?: boolean;
  is_service_rodent?: boolean;
  is_service_mosquito?: boolean;
  service_other?: string;
  time_in?: string;
  time_out?: string;
  payment_condition?: PaymentMethod;
  payment_installment_count?: number;
  is_op_station?: boolean;
  is_op_refill?: boolean;
  is_op_chemical?: boolean;
  is_op_check?: boolean;
  is_op_underground?: boolean;
  is_op_renew?: boolean;
  is_op_spray?: boolean;
  is_op_fogging?: boolean;
  is_op_gel?: boolean;
  is_op_powder?: boolean;
  is_op_bait?: boolean;
  is_op_trap?: boolean;
  op_other?: string;
  work_note?: string;
  next_service_schedule?: string;
  next_service_purpose?: string;
  is_next_refill?: boolean;
  is_next_chemical?: boolean;
  is_next_check?: boolean;
  is_next_underground?: boolean;
  is_next_renew?: boolean;
  quotation_id?: string;
  created_at: string;
  updated_at?: string;
  service_report_pest_detail?: any;
  status: JobStatus;
  
  // Legacy fields (optional for compatibility during migration)
  check_in_time?: string;
  check_out_time?: string;
  service_types?: string[];
  service_actions?: string[];
  termite?: any;
  ant?: any;
  cockroach?: any;
  rat?: any;
  lizard?: any;
  other?: string;
  next_appointment?: {
    notes: string;
    reasons: string[];
    scheduled_at?: string;
  };
  notes?: string;
  images?: {
    before: string[];
    after: string[];
  };
  signatures?: {
    customer: string;
    customer_name: string;
    technician: string;
    technician_name: string;
  };
  materials_used?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
}

export interface FieldJob {
  id: string;
  assessment_id?: string;
  contract_id?: string;
  customer_id: string;
  code: string;
  address: string;
  google_map_link?: string;
  start_time: string;
  end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  technicians: User[];
  work_areas: FieldJobWorkArea[];
  status: JobMainStatus;
  api_status?: string;
  vehicle_id: string;
  service_report?: ServiceReport;
  remarks?: string;
  quotation_id?: string;
  invoice_id?: string;
  invoice?: Invoice;
  operation_details?: string;
  zone?: string;
  group?: string;
  road_line?: string;
  sequence?: string;
  // Legacy camelCase aliases
  customerName?: string;
  startTime?: string;
  endTime?: string;
}
