import { Status } from './core.interface';
import { Customer } from './customer.interface';
import {
  InvoiceStatus,
  ContractStatus,
  InstallmentStatus,
} from '../enums/financial';
import { IBase } from './base.interface';
import { Job } from './job.interface';
import { ContractArea } from './contract.interface';

export interface InstallmentPlan {
  id: string;
  term: number;
  amount: number;
  due_date?: string;
  percentage: number;
  description: string;
  status?: Status;
}


export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  sequence?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  code?: string;
  contract_id?: string;
  quotation_id?: string;
  installment_id?: string;
  term?: number;
  customer_id: string;
  customer_name: string;
  subtotal?: number;
  vat_amount?: number;
  include_vat?: boolean;
  total: number;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string;
  notes?: string;
  is_ad_hoc?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
  customer?: Customer;
}

export interface Receipt {
  id: string;
  code?: string;
  tax_invoice_code?: string;
  invoice_id?: string;
  customer_id: string;
  customer_name: string;
  customer_tax_id?: string;
  amount: number;
  sub_total?: number;
  vat_amount?: number;
  has_tax_invoice?: boolean;
  payment_method: string;
  payment_reference?: string;
  status?: string;
  received_at: string;
  paid_at?: string; // alias for received_at
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  customer?: Customer;
}

export interface Contract {
  id: string;
  code?: string;
  quotation_id?: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  vat_amount: number;
  status: ContractStatus | Status;
  start_date: string;
  end_date: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  customerId?: string;
  quotationId?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  address?: string;
  servicePackage?: string;

  customer?: Customer;
  jobs?: Job[];
  area?: ContractArea[] 
  installments?: InstallmentPlan[];
}

export interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  type: 'รายรับ' | 'รายจ่าย';
  amount: number;
  reference_id?: string;
  wallet_name?: string;
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
  date: string;
  invoiceNo: string;
  details: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalExclVat: number;
  totalInclVat: number;
  netPaidWht: number;
  wallet: string;
  description?: string;
  amount?: number;
  category?: string;
}

export interface IndirectExpense {
  id: string;
  date: string;
  type: string;
  category: string;
  item: string;
  amount: number;
  wallet: string;
}


export interface InvoiceSchedule extends IBase {
  contract_id: string; 
  installment_no: number;
  description: string;
  percentage: number;
  amount: number;
  paid_amount: number;
  due_date: Date;
  status: InstallmentStatus;
  paid_at?: Date
  notes?: string
}

