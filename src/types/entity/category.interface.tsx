// Enum
import { CategoryType } from '@/src/types/enums/category.enum';

// Interface
import { IBase } from './base.interface';

export interface Category extends IBase {
  name: string;
  description: string;
  code: string;
  type?: CategoryType;
  prefix?: string;
}

