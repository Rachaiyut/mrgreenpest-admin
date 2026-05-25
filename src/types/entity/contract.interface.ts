// Interface
import { IBase } from './base.interface';

// Enum
import { BuildingType, ServiceSystem } from '../enums/assessment';
import { ContractStatus } from '../enums/contract';
import { Customer } from './customer.interface';
import { ContractArea } from '@/src/components/features/contracts/ContractForm';
import { InstallmentPlan } from './app.interface';

export interface IContract extends IBase {}



export interface Contract {
  id: string;
  code?: string;
  quotation_id?: string;
  customer_id: string;
  customer_name: string;
  service_location?: string;
  building_type?: string;
  service_type?: string;
  system_used?: string;
  contract_duration?: string;
  service_count?: number;
  total_amount: number;
  vat_amount: number;
  is_separate_contract?: boolean;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  notes?: string;
  signature?: string;
  service_schedule_ids?: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  customerId?: string;
  quotationId?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  address?: string;
  servicePackage?: string;

  customer?: Customer;
  jobs?: any[];
  area?: ContractArea[];
  installments?: InstallmentPlan[];
}

export interface ContractAreaCategory extends IBase {
contract_area_id: string;
  category_id: string;
}
