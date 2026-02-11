import { IBase } from "./base.interface";
import { Customer } from "./customer.interface";
import { Job } from "./job.interface";

export interface ServiceReport extends IBase {
  job_id: string;
  customer_id: string;
  payment_id?: string;
  
  report_date?: string;
  customer_name?: string;

  // Payment
  payment_condition?: string;
  payment_installment_count?: number;

  // ประเภทบริการ
  is_service_termite: boolean;
  is_service_ant_roach: boolean;
  is_service_rodent: boolean;
  is_service_mosquito: boolean;
  service_other?: string;

  time_in?: string;
  time_out?: string;

  // การบริการ
  is_op_station: boolean;
  is_op_refill: boolean;
  is_op_chemical: boolean;
  is_op_check: boolean;
  is_op_underground: boolean;
  is_op_renew: boolean;
  op_other?: string;

  work_note?: string;

  // ส่วนนัดหมาย
  next_service_schedule?: string;
  next_service_purpose?: string;
  is_next_refill: boolean;
  is_next_chemical: boolean;
  is_next_check: boolean;
  is_next_underground: boolean;
  is_next_renew: boolean;

  job: Job;
  customer: Customer;
  service_report_pest_detail: ServicReportPestDetail
}

export interface ServicReportPestDetail extends IBase {
  service_report_id: string;

  // มด
  ant_bait: boolean;

  // แมลงสาบ
  roach_bait: boolean;

  // หนู
  rat_glue_trap: boolean;
  rat_mechanical_trap: boolean;
  rat_bait_station: boolean;
  rat_refill_bait: boolean;

  // จิ้งจก
  lizard_trap: boolean;

  // อื่นๆ
  pest_other?: string;
}