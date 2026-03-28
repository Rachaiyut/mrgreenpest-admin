import { AsessmentStatus, ServiceSystem } from '../enums/assessment';
import { PaymentMethod } from '../enums/financial';
import { PackageType } from '../enums/package';
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
  assessment_id: string;
  package_price_id?: string;
  package_price?: number;
  package_type: PackageType;
  building_type: string;
  building_type_other?: string;
  area_name: string;
  service_system?: ServiceSystem;
  service_system_other?: string;
  area_size?: number;
  total_price: number;

  package_price_relation?: PackagePrice;
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
  payment_installment_count?: number;
  total_price: number;
  created_by: string;
  updated_by: string;
  site_image_id?: string;
  site_image_url?: string;

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
  note?: string;
  due_date?: string | Date;
}


export interface AssessmentAction extends IBase {
  remark?: string;
}
