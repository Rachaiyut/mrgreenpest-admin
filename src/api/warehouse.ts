import { IBaseResponseArray,} from '@/src/types/entity/base.interface';
import { Warehouse, WarehouseQuery, WarehouseStats } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class WarehouseService extends AuthService {
  protected path = '/warehouses';

  async getWarehouses(
    query?: WarehouseQuery
  ): Promise<IBaseResponseArray<Warehouse>> {
    const res = await this.http.get<IBaseResponseArray<Warehouse>>(
      `${this.path}`,
      {
        params: query,
      }
    );

    return res.data;
  }

  async getWarehouseStats(): Promise<WarehouseStats> {
    const res = await this.http.get<WarehouseStats>(`${this.path}/stats`);

    return res.data
  }

  async getWarehouseById(id: string): Promise<Warehouse> {
    const res = await this.http.get<Warehouse>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Warehouse, 'id'>): Promise<Warehouse> {
    const res = await this.http.post<Warehouse>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    const res = await this.http.patch<Warehouse>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const WarehouseApi = new WarehouseService();

