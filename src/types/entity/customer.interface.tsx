// Enum
import { IBase } from "./base.interface";
import { Status } from "@/src/types/enums/base.enum";
import { CustomerType } from "@/src/types/enums/customer.enum";

export interface Customer extends IBase {
    code: string,
    country: string,
    status: Status,
    customer_type: CustomerType,
    first_name: string;
    last_name: string;
    nickname: string,
    tax_id?: string,
    phone: string,
    email: string,
    address_house_no: string,
    sub_district: string,
    district: string,
    province: string,
    postal_code: string,
    google_map_link?: string,
}