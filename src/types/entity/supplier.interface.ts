// Enum
import { IBase, IBaseQuery } from './base.interface';
import { SupplierType } from '@/src/types/enums/customer';

export interface Supplier extends IBase {
  code: string;
  name: string;
  type: SupplierType;
  tax_id: string;
  email: string;
  contact_name: string;
  phone: string;
  phone_2?: string;
  phone_3?: string;
  is_active?: boolean;
}

export interface SupplierQuery extends IBaseQuery {
  type?: SupplierType;
  is_active?: boolean;
}
