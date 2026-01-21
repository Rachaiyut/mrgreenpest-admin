import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { ReturnToSupplier } from '@/src/types/entity/financial.interface'; // Wait, I saw ReturnToSupplier in financial.interface earlier?
import { AuthService } from './auth';

class ReturnToSupplierService extends AuthService {
  protected path = '/return-to-suppliers';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<ReturnToSupplier>> {
    const res = await this.http.get<IBaseResponseArray<ReturnToSupplier>>(this.path, { params: query });
    return res.data;
  }
  
  async getById(id: string): Promise<ReturnToSupplier> {
    const res = await this.http.get<ReturnToSupplier>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<ReturnToSupplier, 'id'>): Promise<ReturnToSupplier> {
    const res = await this.http.post<ReturnToSupplier>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<ReturnToSupplier>): Promise<ReturnToSupplier> {
    const res = await this.http.patch<ReturnToSupplier>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const ReturnToSupplierApi = new ReturnToSupplierService();
