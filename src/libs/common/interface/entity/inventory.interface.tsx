import { Status } from './core.interface';

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

