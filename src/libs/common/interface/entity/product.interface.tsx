// Interface
import { ICategory } from "./category.interface"
import { IUnit } from "./unit.interface"
import { CategoryType } from "../../enum/category.enum"

export interface IPackageCondition {
    id: string;
    max_area: number;
    first_offer_price_no_termites: number;
    first_offer_price_with_termites: number;
    min_price: number;
}

export interface IProduct {
    id: string
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
    category: Partial<ICategory>,
    unit:  Partial<IUnit>
    
    number_of_visits?: number;
    contract_duration?: string;
    conditions?: IPackageCondition[];
}