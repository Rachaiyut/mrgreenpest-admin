import { AsessmentStatus } from '../enums/assessment.enum';

export interface AssessmentItem {
  id: string;
  product_id?: string;
  quantity: number;
  price: number;
}

export interface AssessmentWorkArea {
  id: string;
  name: string;
  building_type?: string;
  area_size: number;
  linear_meters: number;
  service_type: string[];
  service_system?: string;
  estimated_cost: number;
  items: AssessmentItem[];
  package_id?: string;
  selected_condition_id?: string;
  package_price?: number;
}

export interface Assessment {
  id: string;
  created_at: string;
  customer_id: string;
  customer_name: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  scheduled_at: string;
  work_areas: AssessmentWorkArea[];
  total_estimated_cost: number;
  status: AsessmentStatus;
  created_by: string;
  updated_by: string;
  google_map_link?: string;
  location_type?: string;
  payment_conditions?: string;
  zone?: string;
  group?: string;
  road_line?: string;
  sequence?: string;
}
