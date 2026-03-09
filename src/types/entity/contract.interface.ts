// Interface
import { IBase } from './base.interface';

// Enum
import { BuildingType, ServiceSystem } from '../enums/assessment';

export interface IContract extends IBase {}



export interface ContractArea extends IBase {
  package_price_id?: string;
  area_name: string;
  building_type?: BuildingType;
  building_type_other?: string;
  service_system?: ServiceSystem;
  service_system_other?: string;
  service_count: string;
  area_size: number;
  total_price: number;
  package_price?: number | null;

  category_service: ContractAreaCategory[]
}


export interface ContractAreaCategory extends IBase {
contract_area_id: string;
  category_id: string;
}
