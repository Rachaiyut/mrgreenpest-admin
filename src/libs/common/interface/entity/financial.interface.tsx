import { Status } from './core.interface';

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
  installmentId?: string;
  term?: number;
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
  date: string;
  description: string;
  type: 'รายรับ' | 'รายจ่าย';
  amount: number;
  referenceId?: string;
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
  supplierId: string;
  status: Status;
  createdAt: string;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  items: ReturnToSupplierItem[];
  referenceId?: string;
  remarks?: string;
}

