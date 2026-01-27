import { VehicleStatus, WarehouseType } from "../enums/inventory";
import { Status } from "./app.interface";
import { IBase, IBaseQuery } from "./base.interface";
import { Job } from "./job.interface";

export interface WarehouseQuery extends IBaseQuery {
  code?: string;
  name?: string;
  type?: WarehouseType;
  search?: string;
}
export interface Warehouse extends IBase {
  code: string,
  name: string,
  type: WarehouseType,
  status: Status
  warehouse_branch: WarehouseBranch,
  vehicle: Vehicle,
}

export interface WarehouseBranch extends IBase {
  id: string
  warehouse_id: string,
  location: string,
}

export interface Vehicle extends IBase {
  warehouse_id: string
  brand: string,
  model: string
  vehicle_registration: string,
  color: string,
  status: VehicleStatus,

  jobs: Job[]
}


export interface WarehouseStats {
  total: string,
  fixed: string,
  mobile: string,
  active: string
}

