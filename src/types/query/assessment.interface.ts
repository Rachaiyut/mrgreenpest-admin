import { Role } from "../enums/role";
import { IBaseQuery } from "../entity/base.interface";

export interface AssessmentQuery extends IBaseQuery {
    search?: string;
    appointment_date?: Date;
    customer_id?: string;
    status?: string;
}