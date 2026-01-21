// Enum
import { IBase } from "./base.interface";
import { Status } from "@/src/types/enums/base.enum";
import { CustomerType, SupplierType } from "@/src/types/enums/customer.enum";

export interface Supplier extends IBase {
    code: string,
    company_name: string,
    type: SupplierType,
    tax_id: string,
    email: string,
    contact_name: string,
    phone: string,
}