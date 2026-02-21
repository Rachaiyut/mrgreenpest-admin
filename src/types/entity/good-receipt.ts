import { GoodReceiptStatus } from '../enums/good-receipt';
import { IBase } from './base.interface';
import { Product } from './product.interface';

export interface GoodsReceipt extends IBase {
  warehouse_id: string;
  supplier_id: string;
  code: string;
  receipt_no: string;
  status: GoodReceiptStatus;
  items: Item[];
}

export interface Item extends IBase {
  qty_received: number;
  product_id: string;
  receive_note_id: string;
  product: Product;
}
