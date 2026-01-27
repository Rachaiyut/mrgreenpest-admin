import { Role } from "../enums/role";
import { IBaseQuery } from "./base.interface";

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
  Admin = 'ผู้ดูแลระบบ',
  Sales = 'ฝ่ายขาย',
  Accounting = 'ฝ่ายบัญชี',
  Warehouse = 'คลัง',
  Dispatcher = 'จัดงาน',
  Technician = 'ช่างเทคนิค',
}

export interface UserQuery extends IBaseQuery {
  citizen_id?: string;
  phone?: string;
  role?: Role;
}

export interface User {
  id: string;
  nationalId: string;
  name: string;
  nickname: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatarUrl: string;
  creditLimit?: number;
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

