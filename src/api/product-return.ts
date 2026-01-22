import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { ProductReturn } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class ProductReturnService extends AuthService {
  protected path = '/product-returns';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<ProductReturn>> {
    const res = await this.http.get<IBaseResponseArray<ProductReturn>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<ProductReturn> {
    const res = await this.http.get<ProductReturn>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<ProductReturn, 'id'>): Promise<ProductReturn> {
    const res = await this.http.post<ProductReturn>(this.path, data);
    return res.data;
  }

  async update(
    id: string,
    data: Partial<ProductReturn>
  ): Promise<ProductReturn> {
    const res = await this.http.patch<ProductReturn>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const ProductReturnApi = new ProductReturnService();

