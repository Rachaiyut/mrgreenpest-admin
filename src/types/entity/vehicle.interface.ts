import { Role } from "../enums/role";
import { IBaseQuery } from "./base.interface";

export interface VehicleJobQuery extends IBaseQuery {
	techinician_id?: string,
	primary_tech_id?: string,
	role?: Role
	appointment_date?: Date
}