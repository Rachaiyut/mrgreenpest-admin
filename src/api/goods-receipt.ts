import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { GoodsReceipt } from '../types/entity/good-receipt';
import { AuthService } from '.';


class GoodsReceiptService extends AuthService {
  protected path = '/goods-receipts';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<GoodsReceipt>> {
    const res = await this.http.get<IBaseResponseArray<GoodsReceipt>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<GoodsReceipt> {
    const res = await this.http.get<GoodsReceipt>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<GoodsReceipt, 'id'>): Promise<GoodsReceipt> {
    const res = await this.http.post<GoodsReceipt>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<GoodsReceipt>): Promise<GoodsReceipt> {
    const res = await this.http.patch<GoodsReceipt>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async updateStatus(id: string, data: Partial<GoodsReceipt>): Promise<GoodsReceipt> {
    const res = await this.http.patch<GoodsReceipt>(`${this.path}/${id}/status`, data);
    return res.data;
  }
}

export const GoodsReceiptApi = new GoodsReceiptService();

