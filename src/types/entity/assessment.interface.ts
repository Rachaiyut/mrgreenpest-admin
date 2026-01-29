import { AsessmentStatus, ServiceSystem } from '../enums/assessment';
import { PaymentMethod } from '../enums/financial';
import { IBase } from './base.interface';

export interface AssessmentWorkAreaItem extends IBase {
  product_id: string;
  product_name: string,
  product_price: number,
  quantity: number,
  total_price: number,
}

export interface AssessmentWorkAreaCategory extends IBase {
  category_id: string
  name?: string
}

export interface AssessmentWorkArea extends IBase {
  package_price_id?: string,
  building_type: string,
  area_name: string;
  service_system?: ServiceSystem;
  area_size?: number;
  perimeter?: number;
  base_service_price: number;
  total_price: number;
  items: AssessmentWorkAreaItem[];
  category_services: AssessmentWorkAreaCategory[];
}

export interface Assessment extends IBase {
  data: null;
  customer_id: string;
  code: string;
  package_id?: string;
  appointment_date: Date;
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
  payment_condition: PaymentMethod;
  total_price: number;
  created_by: string;
  updated_by: string;
  assessment_areas: AssessmentWorkArea[];
}

