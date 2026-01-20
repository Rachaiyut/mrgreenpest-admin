// Enum
import { CategoryType } from '../../enum/category.enum';

// Interface
import { IBase } from './base.interface';

export interface ICategory extends IBase {
  name: string;
  description: string;
  code: string;
  type?: CategoryType
}
