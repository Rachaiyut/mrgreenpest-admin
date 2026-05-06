import { IBase } from './base.interface';

export interface ChemicalCatalog extends IBase {
  id: string;
  name: string;
  description?: string;
  image_id?: string;
  image_url?: string;
  created_by?: string;
  updated_by?: string;
  creator?: {
    id: string;
    first_name?: string;
    last_name?: string;
    nick_name?: string;
  };
}
