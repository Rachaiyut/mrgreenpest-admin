import { User } from './core.interface';
import { JobStatus } from '../enums/job';

export interface FieldJobWorkArea {
  id: string;
  name: string;
  service_package: string;
}

export interface ServiceReport {
  created_at: string;
  check_in_time: string;
  check_out_time: string;
  service_types: string[];
  service_actions: string[];
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
  status: JobStatus;
}

export interface FieldJob {
  id: string;
  assessment_id?: string;
  contract_id?: string;
  customer_id: string;
  customer_name: string;
  address: string;
  google_map_link?: string;
  start_time: string;
  end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  technicians: User[];
  work_areas: FieldJobWorkArea[];
  status: JobStatus;
  vehicle_id: string;
  service_report?: ServiceReport;
  remarks?: string;
  quotation_id?: string;
  operation_details?: string;
  zone?: string;
  group?: string;
  road_line?: string;
  sequence?: string;
}
