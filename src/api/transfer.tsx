import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { Transfer } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class TransferService extends AuthService {
  protected path = '/transfers';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Transfer>> {
    const res = await this.http.get<IBaseResponseArray<Transfer>>(this.path, { params: query });
    return res.data;
  }
  
  async getById(id: string): Promise<Transfer> {
    const res = await this.http.get<Transfer>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Transfer, 'id'>): Promise<Transfer> {
    const res = await this.http.post<Transfer>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Transfer>): Promise<Transfer> {
    const res = await this.http.patch<Transfer>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const TransferApi = new TransferService();
