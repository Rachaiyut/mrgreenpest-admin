// Enum
import { BuildingType, ServiceSystem } from '../enums/assessment';
import { QuotationStatus } from '../enums/quotaton';

// Interface
import { Customer, InstallmentPlan } from './app.interface';
import { IBase } from './base.interface';

export interface Quotation extends IBase {
  code?: string;
  assessment_id?: string;
  customer_id: string;
  customer_name: string;
  contact_phone?: string;
  service_location?: string;
  building_type?: string;
  service_area?: string;
  service_type?: string;
  service_system?: string;
  system_used?: string;
  contract_duration?: string;
  service_count?: string;
  payment_terms?: string;
  notes?: string;
  google_map_link?: string;
  subtotal?: number;
  vat_amount?: number;
  include_vat?: boolean;
  total: number;
  revision: number;
  original_id?: string;
  status: QuotationStatus; 
  expires_at: string;
  is_installment?: boolean;
  is_signed?: boolean;
  signed_at?: string;
  not_signed_reason?: string;
  signature?: string;
  follow_up_count?: number;
  cancellation_reason?: string;
  created_by?: string;
  updated_by?: string;

  items?: QuotationItem[];
  installments?: InstallmentPlan[];
  quotation_areas?: QuotationArea[];
  customer?: Customer;
}

export interface QuotationItem extends IBase{
  quotation_id: string;
  product_id?: string;
  sequence: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;

  customer?: Customer;
}


export interface QuotationArea {
quotation_id: string;
  package_price_id?: string;
  area_name: string;
  building_type?: BuildingType;
  service_system?: ServiceSystem;
  area_size: number;
  total_price: number;
  package_price?: number;

  items?: QuotationItem[];
}