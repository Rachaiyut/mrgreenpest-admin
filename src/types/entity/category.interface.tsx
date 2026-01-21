// Enum
import { CategoryType } from '@/src/types/enums/category.enum';

// Interface
import { IBase } from './base.interface';

export interface ICategory extends IBase {
  name: string;
  description: string;
  code: string;
  type?: CategoryType;
  prefix?: string;
}

export type Category = Omit<ICategory, 'created_at' | 'updated_at' | 'code'> & {
  created_at?: string;
  updated_at?: string;
  code?: string;
};
