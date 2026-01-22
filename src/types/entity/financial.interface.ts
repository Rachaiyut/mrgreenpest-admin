import { Status } from './core.interface';
import { InvoiceStatus } from '../enums/financial';

export interface InstallmentPlan {
  id: string;
  term: number;
  amount: number;
  due_date?: string;
  percentage: number;
  description: string;
  status: Status;
}

export interface Quotation {
  id: string;
  assessment_id?: string;
  customer_id: string;
  customer_name: string;
  created_at: string;
  expires_at: string;
  status: Status;
  total: number;
  revision: number;
  original_id?: string;
  google_map_link?: string;
  payment_terms?: string;
  installments?: InstallmentPlan[];
}

export interface Invoice {
  id: string;
  quotation_id?: string;
  installment_id?: string;
  term?: number;
  customer_id: string;
  customer_name: string;
  issued_at: string;
  due_at: string;
  status: InvoiceStatus;
  total: number;
}

export interface Receipt {
  id: string;
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  paid_at: string;
  amount: number;
  payment_method: string;
}

export interface Contract {
  id: string;
  customer_id: string;
  customer_name: string;
  quotation_id: string;
  address: string;
  start_date: string;
  end_date: string;
  service_package: string;
  status: Status;
  total_amount: number;
}

export interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  type: 'รายรับ' | 'รายจ่าย';
  amount: number;
  reference_id?: string;
  wallet_name?: string; // Added for display
}

export interface UserWallet {
  user_id: string;
  transactions: WalletTransaction[];
}

export interface ReturnToSupplierItem {
  product_id: string;
  quantity: number;
  reason?: string;
}

export interface ReturnToSupplier {
  id: string;
  warehouse_id: string;
  supplier_id: string;
  status: Status;
  created_at: string;
  created_by: string;
  updated_by: string;
  approved_by?: string;
  items: ReturnToSupplierItem[];
  reference_id?: string;
  remarks?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}
