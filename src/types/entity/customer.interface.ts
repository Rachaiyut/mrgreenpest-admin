// Enum
import { IBase, IBaseQuery } from './base.interface';
import { Status } from '@/src/types/enums/base';
import { CustomerType, Gender } from '@/src/types/enums/customer';
import { Assessment } from './assessment.interface';
import { Contract } from './financial.interface';

export interface Customer extends IBase {
  code: string;
  country: string;
  status: Status;
  type: CustomerType;
  gendder: Gender;
  first_name: string;
  last_name: string;
  nickname: string;
  tax_id?: string;
  primary_phone: string;
  mobile_phone: string;
  phone_3?: string;
  phone_4?: string;
  phone_5?: string;
  phone_6?: string;
  email: string;
  address_house_no: string;
  address_soi?: string;
  address_road?: string;
  sub_district: string;
  district: string;
  province: string;
  road_line: string;
  postal_code: string;
  sequence_no: string;
  service_area: string;
  service_group: string;
  google_map_link?: string;
  service_address_house_no?: string;
  service_address_soi?: string;
  service_address_road?: string;
  service_sub_district?: string;
  service_district?: string;
  service_province?: string;
  service_postal_code?: string;
  service_country?: string;
  service_google_map_link?: string;
  service_same_as_billing?: boolean;
  contact_person?: string;
  contact_person_phone?: string;
  line_user_id?: string;
  assessments: Assessment[];
  contracts: Contract[];
}

export interface CustomerService extends IBase {
  code: string;
  country: string;
  status: Status;
  type: CustomerType;
  gendder: Gender;
  first_name: string;
  last_name: string;
  nickname: string;
  tax_id?: string;
  phone: string;
  email: string;
  address_house_no: string;
  sub_district: string;
  district: string;
  province: string;
  road_line: string;
  postal_code: string;
  sequence_no: string;
  service_area: string;
  service_group: string;
  google_map_link?: string;

  assessments: Assessment[];
  contracts: any[];
}

export interface CustomerQuery extends IBaseQuery {
  type?: string;
}
