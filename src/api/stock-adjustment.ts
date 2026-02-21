import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { StockAdjustment } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class StockAdjustmentService extends AuthService {
  protected path = '/stock-adjustments';

  async getAll(
    query?: IBaseQuery
  ): Promise<IBaseResponseArray<StockAdjustment>> {
    const res = await this.http.get<IBaseResponseArray<StockAdjustment>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<StockAdjustment> {
    const res = await this.http.get<StockAdjustment>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<StockAdjustment, 'id'>): Promise<StockAdjustment> {
    const res = await this.http.post<StockAdjustment>(this.path, data);
    return res.data;
  }

  async update(
    id: string,
    data: Partial<StockAdjustment>
  ): Promise<StockAdjustment> {
    const res = await this.http.patch<StockAdjustment>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const StockAdjustmentApi = new StockAdjustmentService();
