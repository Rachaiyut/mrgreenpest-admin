import { AsessmentStatus, ServiceSystem } from '../enums/assessment';
import { PaymentMethod } from '../enums/financial';
import { IBase } from './base.interface';
import { Customer } from './customer.interface';
import { Package, PackagePrice } from './package.interface';

export interface AssessmentWorkAreaItem extends IBase {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total_price: number;
}

export interface AssessmentWorkAreaCategory extends IBase {
  category_id: string;
  category?: {
    id: string;
    name: string;
  };
  name?: string;
}

export interface AssessmentWorkArea extends IBase {
  package_price_id?: string;
  packagePriceRelation?: PackagePrice;
  package_price?: number; // Package price snapshot
  building_type: string;
  area_name: string;
  service_system?: ServiceSystem;
  area_size?: number;
  perimeter?: number;
  base_service_price: number;
  total_price: number;
  items?: AssessmentWorkAreaItem[];
  category_services?: AssessmentWorkAreaCategory[];
}

export interface Assessment extends IBase {
  customer_id: string;
  code: string;
  package_id?: string;
  appointment_date: Date | string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  zipcode: string;
  zone: string;
  route_group: string;
  road_line: string;
  sequence: string;
  google_map_link: string;
  status: AsessmentStatus;
  payment_condition?: PaymentMethod;
  // payment_installment_count?: number;
  total_price: number;
  created_by: string;
  updated_by: string;

  // Relations
  assessment_areas?: AssessmentWorkArea[];
  customer?: Customer;
  package?: Package;
  installments?: AssessmentInstallment[];
}

export interface AssessmentInstallment extends IBase {
  assessment_id: string;
  installment_no: number;
  amount: number;
  due_date?: string;
  note?: string;
}

