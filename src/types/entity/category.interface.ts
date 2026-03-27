// Enum
import { CategoryType } from '@/src/types/enums/category';

// Interface
import { IBase, IBaseQuery } from './base.interface';

export interface CategoryQuery extends IBaseQuery {
  search?: string;
  type?: CategoryType;
  is_active?: boolean;
}

export interface Category extends IBase {
  name: string;
  description: string;
  code: string;
  type?: CategoryType;
  prefix?: string;
  product_count?: number;
  is_active?: boolean;
}
