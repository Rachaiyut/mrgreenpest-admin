// Enum
import { IBase, IBaseQuery } from './base.interface';
import { Status } from '@/src/types/enums/base';
import { CustomerType, Gender } from '@/src/types/enums/customer';
import { Assessment } from './assessment.interface';

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

  assessments: Assessment[]
  contracts: any[]
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

  assessments: Assessment[]
  contracts: any[]
}



export interface CustomerQuery extends IBaseQuery {
  type?: string
}