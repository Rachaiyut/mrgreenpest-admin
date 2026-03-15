import { IBaseResponseArray } from '@/src/types/entity/base.interface';
import {
  VehicleStockLimit,
  Warehouse,
  WarehouseQuery,
  WarehouseStats,
} from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';
import { VehicleJobQuery } from '../types/query/vehicle.interface';

class VehicleService extends AuthService {
  protected path = '/vehicles';

  async getVehicles(query?: WarehouseQuery): Promise<IBaseResponseArray<Warehouse>> {
    const res = await this.http.get<IBaseResponseArray<Warehouse>>(
      `${this.path}`,
      {
        params: query,
      }
    );

    return res.data;
  }

  async getVehiclesWithUserJobs(query?: VehicleJobQuery): Promise<IBaseResponseArray<Warehouse>> {
    const res = await this.http.get<IBaseResponseArray<Warehouse>>(
      `${this.path}/jobs`,
      {
        params: query,
      }
    );

    return res.data;
  }

  async getVehicleById(id: string): Promise<Warehouse> {
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

  async getVehicleStockLimit(id: string): Promise<VehicleStockLimit[]> {
    const res = await this.http.get<VehicleStockLimit[]>(
      `${this.path}/${id}/vehicle-stock-limit`
    );
    return res.data;
  }
}

export const VehicleApi = new VehicleService();
