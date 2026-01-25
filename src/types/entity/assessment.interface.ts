import { AsessmentStatus, ServiceType } from '../enums/assessment';
import { IBase } from './base.interface';

export interface AssessmentItem extends IBase {
  id: string;
  product_id?: string;
  quantity: number;
  price: number;
}

export interface AssessmentWorkArea extends IBase {
  area_name: string;
  building_type?: string;
  service_system?: string;
  area_size?: number;
  perimeter?: number;
  base_service_price: number;
  total_price: number;
  products: AssessmentItem[];

  service_type: ServiceType;
}

export interface Assessment extends IBase {
  customer_id: string;
  code: string;
  package_id: string;
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
  work_areas: AssessmentWorkArea[];
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
}
