import { Role } from '../enums/role';
import { IBaseQuery } from './base.interface';

export enum Status {
  Draft = 'จัดทำ',
  Scheduled = 'นัดหมายแล้ว',
  Planned = 'วางแผนแล้ว',
  InProgress = 'กำลังดำเนินการ',
  Paused = 'พักงาน',
  Completed = 'เสร็จสิ้น',
  Converted = 'แปลงแล้ว',
  Failed = 'ล้มเหลว',
  Cancelled = 'ยกเลิก',
  Pending = 'รอดำเนินการ',
  PendingApproval = 'รออนุมัติ',
  Approved = 'เซ็น (อนุมัติ)',
  Rejected = 'ปฏิเสธ',
  Paid = 'ชำระเงินแล้ว',
  Overdue = 'เกินกำหนด',
  Sent = 'ส่งแล้ว',
  UnderReview = 'ลูกค้าพิจารณา',
  Revise = 'แก้ไขตามรอบ',
  Closed = 'ปิดงาน',
}

export enum UserRole {
  CEO = 'CEO',
  COO = 'COO',
  CFO = 'CFO',
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  LEAD_TECH = 'LEAD_TECH',
  TECH = 'TECH',
  // Legacy/Additional roles
  SALES = 'SALES',
  WAREHOUSE = 'WAREHOUSE',
  DISPATCHER = 'DISPATCHER',
  ACCOUNTING = 'ACCOUNTING',
}

export interface UserQuery extends IBaseQuery {
  citizen_id?: string;
  phone?: string;
  role?: Role;
}

export interface User {
  id: string;
  citizen_id?: string;
  first_name: string;
  last_name: string;
  nick_name?: string;
  email?: string;
  phone?: string;
  role?: any;
  stroage_id?: string;
  creditLimit?: number;
  // Computed property for display
  name: string;
  avatarUrl?: string;
}

export interface Address {
  street: string;
  soi?: string;
  road?: string;
  subdistrict: string;
  district: string;
  province: string;
  postalcode: string;
  country: string;
  zone?: string;
  group?: string;
  roadLine?: string;
  sequence?: string;
}
