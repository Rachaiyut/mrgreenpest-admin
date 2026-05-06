import { User } from './core.interface';
import { JobMainStatus, JobStatus } from '../enums/job';
import { PaymentMethod } from '../enums/financial';
import { Invoice } from './financial.interface';
import { Customer, TeamMember, Vehicle } from './app.interface';

export interface ServiceReportPestDetail {
  id?: string;
  service_report_id?: string;
  // Termite
  termite_status?: string;
  termite_install_stations_count?: number;
  termite_add_bait_count?: number;
  termite_found_enabled?: boolean;
  termite_found_count?: number;
  termite_place_boxes_enabled?: boolean;
  termite_place_boxes_count?: number;
  termite_place_boxes_area?: string;
  termite_inject_pipes_count?: number;
  termite_change_wood?: boolean;
  termite_change_lid?: boolean;
  termite_add_focus_bait?: boolean;
  termite_inject_shaft?: boolean;
  termite_other?: string;
  // Ant
  ant_bait?: boolean;
  ant_spray_bio?: boolean;
  ant_around_building?: boolean;
  ant_in_shaft?: boolean;
  ant_inside_building?: boolean;
  // Cockroach
  roach_bait?: boolean;
  // Rat
  rat_glue_trap?: boolean;
  rat_mechanical_trap?: boolean;
  rat_bait_station?: boolean;
  rat_refill_bait?: boolean;
  // Lizard
  lizard_trap?: boolean;
  // Mosquito
  mosquito_spray_chemical?: boolean;
  mosquito_fogging?: boolean;
  // Other
  pest_other?: string;
}

export interface PestFormData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

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
  payment_amount?: number | string;
  payment_slip_file_id?: string;
  quotation_file_id?: string;
  blueprint_file_id?: string;
  payment_slip_url?: string | null;
  quotation_url?: string | null;
  blueprint_url?: string | null;
  customer_appointment_date?: string | null;
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
  customer_signature?: string;
  customer_sign_name?: string;
  technician_signature?: string;
  technician_sign_name?: string;
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
  service_report_pest_detail?: ServiceReportPestDetail;
  status: JobStatus;

  // Form state fields for ServiceReportModal
  check_in_time?: string;
  check_out_time?: string;
  service_types?: string[];
  service_actions?: string[];
  service_other_text?: string;
  pest_other_text?: string;
  termite?: PestFormData;
  ant?: PestFormData;
  cockroach?: PestFormData;
  rat?: PestFormData;
  lizard?: PestFormData;
  mosquito?: PestFormData;
  other?: string;
  next_appointment?: {
    notes: string;
    reasons: string[];
    scheduled_at?: string;
    /** วันที่ลูกค้านัดหมาย (Confirm) — กรณีลูกค้ากรอกวันที่ชัดเจน (YYYY-MM-DD) */
    customer_confirmed_at?: string | null;
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
  appointment_date: Date;
  code: string;
  address: string;
  google_map_link?: string;
  start_time: string;
  end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  technicians: User[];
  api_status?: string;
  vehicle_id: string;
  remarks?: string;
  quotation_id?: string;
  invoice_id?: string;
  invoice?: Invoice;
  operation_details?: string;
  zone?: string;
  group?: string;
  road_line?: string;
  sequence?: string;
  customerName?: string;
  startTime?: string;
  endTime?: string;
  work_areas: FieldJobWorkArea[];
  status: JobMainStatus;
  rejection_reason?: string | null;
  created_by?: string | null;
  start_date?: Date;
  end_dare?: Date

  customer?: Customer;
  primary_technician?: User;
  job_team_members?: TeamMember[];
  team_member?: TeamMember[];
  vehicle?: Vehicle;
  service_report?: ServiceReport;
}

export interface JobRejectionHistoryEntry {
  id: string;
  job_id: string;
  reason: string;
  rejected_by?: string | null;
  created_at: string;
  rejected_by_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    nick_name?: string;
  } | null;
}
