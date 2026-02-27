import {
  VehicleStatus,
  WarehouseType,
  WithdrawalStatus,
  ProductReturnStatus,
  StockAdjustmentStatus,
  TransferStatus,
  GoodsReceiptStatus,
  IssueSummaryStatus,
} from '../enums/inventory';
import { Status } from './app.interface';
import { IBase, IBaseQuery } from './base.interface';
import { Job } from './job.interface';

export interface WarehouseQuery extends IBaseQuery {
  code?: string;
  name?: string;
  type?: WarehouseType;
  search?: string;
}
export interface WithdrawalLimit {
  product_id: string;
  max_quantity: number;
}

export interface StockBalance {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    code: string;
    unit: {
      name: string;
    };
  };
}

export interface Warehouse extends IBase {
  code: string;
  name: string;
  type: WarehouseType;
  status: Status;
  warehouse_branch: WarehouseBranch;
  vehicle: Vehicle;
  withdrawal_limits?: WithdrawalLimit[];
  stock?: StockBalance[];
}

export interface WarehouseBranch extends IBase {
  id: string;
  warehouse_id: string;
  location: string;
}

export interface Vehicle extends IBase {
  warehouse_id: string;
  brand: string;
  model: string;
  vehicle_registration: string;
  color: string;
  status: VehicleStatus;

  jobs: Job[];
}

export interface VehicleStockLimit extends IBase {
  warehouse_id: string;
  vehicle_id: string;
  product_id: string;
  max_return_qty: number;
}

export interface WarehouseStats {
  total: string;
  fixed: string;
  mobile: string;
  active: string;
}

export interface WithdrawalItem {
  id?: string;
  withdrawal_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WithdrawalExpense {
  description: string;
  amount: number;
}

export interface Withdrawal extends IBase {
  code?: string;
  warehouse_id: string;
  job_id?: string;
  assessment_id?: string;
  contract_id?: string;
  purpose?: string;
  status: WithdrawalStatus | Status;
  notes?: string;
  created_by: string;
  updated_by?: string;
  items?: WithdrawalItem[];
  expenses?: WithdrawalExpense[];
  requester_id?: string;
  recipient_id?: string;
  to_warehouse_id?: string;
  reference_ids?: string[];
}

export interface GoodsReceiptItem {
  id?: string;
  receive_note_id?: string;
  product_id: string;
  qty_received?: number;
  quantity?: number;
  unit_price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GoodsReceive extends IBase {
  code?: string;
  receipt_no?: string;
  warehouse_id: string;
  supplier_id?: string;
  reference_id?: string;
  status?: GoodsReceiptStatus | Status;
  created_by?: string;
  updated_by?: string;
  items?: GoodsReceiptItem[];
  remarks?: string;
}

export interface TransferItem {
  id?: string;
  transfer_note_id?: string;
  product_id: string;
  qty?: number;
  quantity?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Transfer extends IBase {
  code?: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: TransferStatus | Status;
  created_by?: string;
  updated_by?: string;
  items?: TransferItem[];
  remark?: string;
}

export interface StockAdjustmentItem {
  id?: string;
  adjustment_id?: string;
  product_id: string;
  qty_before?: number;
  qty_adjustment?: number;
  qty_after?: number;
  quantity_change?: number;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StockAdjustment extends IBase {
  adjustment_code?: string;
  warehouse_id: string;
  reason?: string;
  status: StockAdjustmentStatus | Status;
  created_by?: string;
  updated_by?: string;
  items?: StockAdjustmentItem[];
  remarks?: string;
}

export interface ProductReturnItem {
  id?: string;
  product_return_id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductReturn extends IBase {
  code?: string;
  warehouse_id: string;
  job_id?: string;
  return_reason?: string;
  status: ProductReturnStatus | Status;
  notes?: string;
  created_by: string;
  updated_by?: string;
  items?: ProductReturnItem[];
}

// Stock Issue Summary Interfaces
export interface StockIssueItemSummary extends IBase {
  stock_issue_summary_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
}

export interface StockIssueSummary extends IBase {
  warehouse_id: string;
  notes?: string;
  job_id?: string;
  status: IssueSummaryStatus
  requester_id?: string;
  created_by?: string;
  items?: StockIssueItemSummary[];
}
