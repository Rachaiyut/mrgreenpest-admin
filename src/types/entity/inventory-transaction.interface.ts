import { Product } from './product.interface';
import { Warehouse } from './inventory.interface';

export enum TransactionType {
  RECEIVE = 'RECEIVE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUST = 'ADJUST',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
}

export interface InventoryTransaction {
  id: string;
  warehouse_id: string;
  product_id: string;
  transaction_type: TransactionType | string;
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  note?: string;
  created_at: string;

  warehouse?: Warehouse;
  product?: Product;
}
