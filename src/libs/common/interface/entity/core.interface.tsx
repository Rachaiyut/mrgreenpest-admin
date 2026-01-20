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

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  type: 'บุคคลธรรมดา' | 'นิติบุคคล';
  contactPerson: string;
  contactPersonPhone?: string;
  gender?: 'ชาย' | 'หญิง' | 'ไม่ระบุ';
  email?: string;
  phone: string;
  mobilePhone?: string;
  additionalPhones?: string[];
  address: Address;
  taxId: string;
  createdAt: string;
  contractUntil?: string;
  googleMapLink?: string;
  status?: Status;
}

export interface PackageCondition {
  id: string;
  maxArea: number;
  firstOfferPriceNoTermites: number;
  firstOfferPriceWithTermites: number;
  minPrice: number;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  type: 'สินค้า' | 'บริการ';
  categoryId: string;
  unit: string;
  price: number;
  costPrice?: number;
  fdaRegNo?: string;
  stock: number;
  lowStockThreshold: number;
  warehouse: string;
  createdBy: string;
  updatedBy: string;
  description?: string;
  numberOfVisits?: number;
  contractDuration?: string;
  conditions?: PackageCondition[];
}

