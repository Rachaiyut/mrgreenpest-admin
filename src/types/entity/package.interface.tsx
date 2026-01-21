// Interface
import { IBase } from "./base.interface"
import { Category } from "./category.interface"
import { IUnit } from "./unit.interface"
import { CategoryType } from "@/src/types/enums/category.enum"

export interface PackageCondition {
    id: string;
    max_area: number;
    first_offer_price_no_termites: number;
    first_offer_price_with_termites: number;
    min_price: number;
}

export interface Package extends IBase {
    category_id: string,
    unit_id: string,
    code: string,
    barcode: string,
    name: string,
    cost_price: string,
    price?: number, // Selling price
    description?: string,
    type?: CategoryType,
    min_stock: number,
    fda_number: string,
    created_by: string,
    category: Partial<Category>,
    unit:  Partial<IUnit>
    
    number_of_visits?: number;
    contract_duration?: string;
    conditions?: PackageCondition[];
    stock?: number;
}