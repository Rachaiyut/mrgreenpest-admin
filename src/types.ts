
import type { FC } from 'react';

export type Page =
  | 'Dashboard'
  | 'ลูกค้า'
  | 'ใบประเมิน'
  | 'ภาคสนาม'
  | 'ใบเสนอราคา'
  | 'ใบแจ้งหนี้'
  | 'ใบกำกับภาษี/ใบเสร็จรับเงิน'
  | 'หมวดหมู่'
  | 'สินค้า/บริการ'
  | 'แพ็กเกจ'
  | 'คลังสินค้า'
  | 'ผู้จัดจำหน่าย'
  | 'รับเข้า'
  | 'เบิกสินค้า/อุปกรณ์ และค่าใช้จ่าย'
  | 'โอนย้าย'
  | 'ปรับปรุง Stock'
  | 'คืนสินค้า'
  | 'ผู้ใช้งาน'
  | 'จัดการบทบาท'
  | 'การแจ้งเตือน'
  | 'รายงาน'
  | 'เบิกสินค้าคืนผู้จำหน่าย'
  | 'รายงานรายได้ (รายเดือน)'
  | 'รายได้ออกใบกำกับ(รายเดือน)'
  | 'ค่าใช้จ่ายทางอ้อม'
  | 'บัญชีเงินสดรายวัน'
  | 'ค่าใช้จ่ายทางตรง'
  | 'ยอดขาย(รายเดือน)'
  | 'สรุปยอดขาย(รายเดือน)';

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
  additionalPhones?: string[]; // Up to 3 additional numbers
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

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'สินค้า' | 'บริการ';
  prefix?: string;
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

export interface AssessmentItem {
  id: string;
  productId?: string;
  quantity: number;
  price: number;
}

export interface AssessmentWorkArea {
  id: string;
  name: string;
  buildingType?: string;
  areaSize: number;
  linearMeters: number;
  serviceType: string[];
  serviceSystem?: string;
  estimatedCost: number;
  items: AssessmentItem[];
  packageId?: string;
  selectedConditionId?: string;
  packagePrice?: number;
}

export interface Assessment {
  id: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  scheduledAt: string;
  workAreas: AssessmentWorkArea[];
  totalEstimatedCost: number;
  status: Status;
  createdBy: string;
  updatedBy: string;
  googleMapLink?: string;
  locationType?: string;
  paymentConditions?: string;
  zone?: string;
  group?: string;
  roadLine?: string;
  sequence?: string;
}

export interface FieldJobWorkArea {
  id: string;
  name: string;
  servicePackage: string;
}

export interface ServiceReport {
  createdAt: string;
  checkInTime: string;
  checkOutTime: string;
  serviceTypes: string[];
  serviceActions: string[];
  termite?: any;
  ant?: any;
  cockroach?: any;
  rat?: any;
  lizard?: any;
  other?: string;
  nextAppointment?: {
    notes: string;
    reasons: string[];
    scheduledAt?: string;
  };
  notes?: string;
  images?: {
    before: string[];
    after: string[];
  };
  signatures?: {
    customer: string; // Base64 or URL
    customerName: string;
    technician: string; // Base64 or URL
    technicianName: string;
  };
  materialsUsed?: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }[];
  status: Status;
}

export interface FieldJob {
  id: string;
  assessmentId?: string;
  contractId?: string;
  customerId: string;
  customerName: string;
  address: string;
  googleMapLink?: string;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  technicians: User[];
  workAreas: FieldJobWorkArea[];
  status: Status;
  vehicleId: string;
  serviceReport?: ServiceReport;
  remarks?: string;
  quotationId?: string;
  operationDetails?: string;
  zone?: string;
  group?: string;
  roadLine?: string;
  sequence?: string;
}

export interface InstallmentPlan {
  id: string;
  term: number;
  amount: number;
  dueDate?: string;
  percentage: number;
  description: string;
  status: Status;
}

export interface Quotation {
  id: string;
  assessmentId?: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  expiresAt: string;
  status: Status;
  total: number;
  revision: number;
  originalId?: string;
  googleMapLink?: string;
  paymentTerms?: string;
  installments?: InstallmentPlan[];
}

export interface Invoice {
  id: string;
  quotationId?: string;
  installmentId?: string; // Link to specific installment
  term?: number; // e.g., 1 (for 1st installment)
  customerId: string;
  customerName: string;
  issuedAt: string;
  dueAt: string;
  status: Status;
  total: number;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  paidAt: string;
  amount: number;
  paymentMethod: string;
}



export interface NavLink {
  type: 'link';
  name: Page;
  icon: FC<any>;
}

export interface NavGroup {
  type: 'group';
  name: string;
  icon: FC<any>;
  subItems: { name: Page; icon?: FC<any> }[];
}

export type NavigationItem = NavLink | NavGroup;

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  type: 'คลัง' | 'รถ';
  status?: Status;
  licensePlate?: string;
  brand?: string;
  model?: string;
  color?: string;
  withdrawalLimits?: { [productId: string]: number };
}

export interface GoodsReceiptItem {
  productId: string;
  quantity: number;
}

export interface GoodsReceipt {
  id: string;
  warehouseId: string;
  status: Status;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  items: GoodsReceiptItem[];
  referenceId?: string;
  remarks?: string;
  supplierId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: 'นิติบุคคล' | 'บุคคลธรรมดา';
  taxId?: string;
  contactPerson?: string;
  phones: string[];
  email?: string;
}

export interface WithdrawalItem {
  productId: string;
  quantity: number;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export interface Withdrawal {
  id: string;
  createdAt: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: Status;
  createdBy: string;
  approvedBy?: string;
  updatedBy?: string;
  items: WithdrawalItem[];
  expenses?: ExpenseItem[];
  referenceIds?: string[];
  recipientId?: string;
  remarks?: string;
  customerIds?: string[];
}

export interface TransferItem {
  productId: string;
  quantity: number;
}

export interface Transfer {
  id: string;
  createdAt: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  reason: string;
  createdBy: string;
  items: TransferItem[];
  status: Status;
}

export interface StockAdjustmentItem {
  productId: string;
  originalQuantity: number;
  adjustedQuantity: number;
  reason: string;
}

export interface StockAdjustment {
  id: string;
  createdAt: string;
  warehouseId: string;
  reason: string;
  createdBy: string;
  items: StockAdjustmentItem[];
  status: Status;
}

export interface ProductReturnItem {
  productId: string;
  quantity: number;
  reason: string;
}

export interface ProductReturn {
  id: string;
  createdAt: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  createdBy: string;
  items: ProductReturnItem[];
  status: Status;
  withdrawalRefId?: string;
}

export interface Contract {
  id: string;
  customerId: string;
  customerName: string;
  quotationId: string;
  address: string;
  startDate: string;
  endDate: string;
  servicePackage: string;
  status: Status;
  totalAmount: number;
}

export interface WalletTransaction {
  id: string;
  date: string; // ISO string
  description: string;
  type: 'รายรับ' | 'รายจ่าย';
  amount: number;
  referenceId?: string; // e.g., withdrawal ID
}

export interface UserWallet {
  userId: string;
  transactions: WalletTransaction[];
}

export interface ReturnToSupplierItem {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface ReturnToSupplier {
  id: string;
  warehouseId: string;
  supplierId: string; // The supplier receiving the return
  status: Status;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  items: ReturnToSupplierItem[];
  referenceId?: string; // e.g. Original GR Number
  remarks?: string;
}
