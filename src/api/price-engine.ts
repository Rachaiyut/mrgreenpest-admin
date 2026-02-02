import { AuthService } from './auth';

// Types
export interface AddOnProduct {
    product_id: string;
    quantity: number;
}

export interface CalculatePriceRequest {
    package_id: string;
    area_size: number;
    has_termite: boolean;
    add_on_products?: AddOnProduct[];
}

export interface AddOnProductResult {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    total: number;
}

export interface PriceCalculationResult {
    package_id: string;
    package_name: string;
    area_size: number;
    area_range_used: number;
    has_termite: boolean;
    unit_price_per_sqm: number;
    base_price: number;
    minimum_price: number;
    applied_base_price: number;
    add_on_items: AddOnProductResult[];
    add_on_total: number;
    grand_total: number;
}

interface PriceResponse {
    status: string;
    success: boolean;
    data: PriceCalculationResult;
}

class PriceEngineService extends AuthService {
    protected path = '/price-engine';

    /**
     * Calculate price based on package, area size, and add-on products
     */
    async calculate(request: CalculatePriceRequest): Promise<PriceCalculationResult> {
        const res = await this.http.post<PriceResponse>(`${this.path}/calculate`, request);
        return res.data.data;
    }
}

export const PriceEngineApi = new PriceEngineService();
