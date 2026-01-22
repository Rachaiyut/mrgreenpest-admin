import { IBase } from './base.interface';
import { Category } from './category.interface';
import { Unit } from './unit.interface';

export interface Product extends IBase {
  category_id: string;
  unit_id: string;
  code: string;
  name: string,
  barcode: string;
  cost_price: string;
  min_stock: number;
  fda_number: string;
  created_by: string;

  category: Category;
  unit: Unit;
}
