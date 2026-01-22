// Interface
import { IBase, IBaseQuery } from './base.interface';

export interface PackageCondition {
  id: string;
  max_area: number;
  first_offer_price_no_termites: number;
  first_offer_price_with_termites: number;
  min_price: number;
}

export interface Package extends IBase {
  category_id: string;
  visit_limit: number;
  remark: string;
  code: string;
  name: string;
  contract_period: number;
  package_price: PackagePrice[];
}

export interface PackagePrice extends IBase {
  area_range: number;
  price_with_termite: number;
  price_without_termite: number;
  minimum_price: number;
}

export interface PackageQuery extends IBaseQuery {
  code: string;
  name: string;
  visit_limit: number;
}
