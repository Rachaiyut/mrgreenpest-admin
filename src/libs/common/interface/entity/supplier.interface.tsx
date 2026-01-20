// Enum
import { IBase } from "./base.interface";
import { Status } from "../../enum/base.enum";
import { CustomerType, SupplierType } from "../../enum/customer.enum";

export interface ISupplier extends IBase {
    code: string,
    company_name: string,
    type: SupplierType,
    tax_id: string,
    email: string,
    contact_name: string,
    phone: string,
}