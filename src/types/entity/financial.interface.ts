import { Status } from './core.interface';
import { InvoiceStatus, QuotationStatus, ContractStatus } from '../enums/financial';

export interface InstallmentPlan {
  id: string;
  term: number;
  amount: number;
  due_date?: string;
  percentage: number;
  description: string;
  status: Status;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id?: string;
  sequence: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Quotation {
  id: string;
  code?: string;
  assessment_id?: string;
  customer_id: string;
  customer_name: string;
  contact_phone?: string;
  service_location?: string;
  building_type?: string;
  service_area?: string;
  service_type?: string;
  service_system?: string;
  system_used?: string;
  contract_duration?: string;
  service_count?: string;
  payment_terms?: string;
  notes?: string;
  google_map_link?: string;
  subtotal?: number;
  vat_amount?: number;
  include_vat?: boolean;
  total: number;
  revision: number;
  original_id?: string;
  status: QuotationStatus | Status; // Support both for backwards compatibility
  expires_at: string;
  is_installment?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  items?: QuotationItem[];
  installments?: InstallmentPlan[];
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
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  items?: InvoiceItem[];
}

export interface Receipt {
  id: string;
  code?: string;
  invoice_id?: string;
  customer_id: string;
  customer_name: string;
  amount: number;
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
}

export interface Contract {
  id: string;
  code?: string;
  quotation_id?: string;
  customer_id: string;
  customer_name: string;
  service_location?: string;
  service_type?: string;
  system_used?: string;
  contract_duration?: string;
  service_count?: number;
  total_amount: number;
  status: ContractStatus | Status; // Support both for backwards compatibility
  start_date: string;
  end_date: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy/backwards compatibility fields (camelCase aliases)
  customerId?: string;
  quotationId?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  address?: string;
  servicePackage?: string;
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
