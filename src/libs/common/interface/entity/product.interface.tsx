// Interface
import { ICategory } from "./category.interface"
import { IUnit } from "./unit.interface"
import { CategoryType } from "../../enum/category.enum"

export interface IProduct {
    id: string
    category_id: string,
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
}