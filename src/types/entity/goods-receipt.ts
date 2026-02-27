import { GoodsReceiptStatus } from '../enums/inventory';
import { Status } from '../enums/base';
import { IBase } from './base.interface';
import { Product } from './product.interface';

export interface GoodsReceive extends IBase {
  warehouse_id: string;
  supplier_id: string;
  code: string;
  receipt_no: string;
  status: GoodsReceiptStatus | Status;
  items: Item[];
}

export interface Item extends IBase {
  qty_received: number;
  product_id: string;
  receive_note_id: string;
  product: Product;
}
