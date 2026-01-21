import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { Receipt } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class ReceiptService extends AuthService {
  protected path = '/receipts';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Receipt>> {
    const res = await this.http.get<IBaseResponseArray<Receipt>>(this.path, { params: query });
    return res.data;
  }
  
  async getById(id: string): Promise<Receipt> {
    const res = await this.http.get<Receipt>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Receipt, 'id'>): Promise<Receipt> {
    const res = await this.http.post<Receipt>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Receipt>): Promise<Receipt> {
    const res = await this.http.patch<Receipt>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const ReceiptApi = new ReceiptService();
