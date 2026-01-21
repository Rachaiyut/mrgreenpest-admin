import { Status } from './core.interface';

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  type: 'คลัง' | 'รถ';
  status?: Status;
  license_plate?: string;
  brand?: string;
  model?: string;
  color?: string;
  withdrawal_limits?: { [product_id: string]: number };
}

export interface GoodsReceiptItem {
  product_id: string;
  quantity: number;
}

export interface GoodsReceipt {
  id: string;
  warehouse_id: string;
  status: Status;
  created_at: string;
  created_by: string;
  updated_by: string;
  approved_by?: string;
  items: GoodsReceiptItem[];
  reference_id?: string;
  remarks?: string;
  supplier_id?: string;
}

export interface WithdrawalItem {
  product_id: string;
  quantity: number;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export interface Withdrawal {
  id: string;
  created_at: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: Status;
  created_by: string;
  approved_by?: string;
  updated_by?: string;
  items: WithdrawalItem[];
  expenses?: ExpenseItem[];
  reference_ids?: string[];
  recipient_id?: string;
  remarks?: string;
  customer_ids?: string[];
}

export interface TransferItem {
  product_id: string;
  quantity: number;
}

export interface Transfer {
  id: string;
  created_at: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  reason: string;
  created_by: string;
  items: TransferItem[];
  status: Status;
}

export interface StockAdjustmentItem {
  product_id: string;
  original_quantity: number;
  adjusted_quantity: number;
  reason: string;
}

export interface StockAdjustment {
  id: string;
  created_at: string;
  warehouse_id: string;
  reason: string;
  created_by: string;
  items: StockAdjustmentItem[];
  status: Status;
}

export interface ProductReturnItem {
  product_id: string;
  quantity: number;
  reason: string;
}

export interface ProductReturn {
  id: string;
  created_at: string;
  warehouse_id: string;
  created_by: string;
  items: ProductReturnItem[];
  status: Status;
  remarks?: string;
}
