import { WarehouseType } from "../enums/warehouse";
import { Status } from "./app.interface";
import { IBase } from "./base.interface";

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
}


export interface WarehouseStats {
  total: string,
  fixed: string,
  mobile: string,
  active: string
}