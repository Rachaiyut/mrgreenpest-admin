import { IBaseResponseArray } from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

export interface InventoryTransaction {
  id: string;
  type: 'RECEIVE' | 'TRANSFER' | 'ADJUSTMENT' | 'USAGE' | 'COUNT';
  product_id: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  quantity: number;
  ref_id?: string;
  ref_no?: string;
  remark?: string;
  created_at: string;
  product?: { id: string; code: string; name: string; unit?: { name: string } };
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
}

class InventoryTransactionService extends AuthService {
  protected path = '/inventory-transactions';

  async getAll(query?: {
    warehouse_id?: string;
    type?: string;
    product_id?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<IBaseResponseArray<InventoryTransaction>> {
    const res = await this.http.get<IBaseResponseArray<InventoryTransaction>>(this.path, {
      params: query,
    });
    return res.data;
  }
}

export const InventoryTransactionApi = new InventoryTransactionService();
