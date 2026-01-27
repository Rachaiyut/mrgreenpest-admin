import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

class anyService extends AuthService {
  protected path = '/withdrawals';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<any>> {
    const res = await this.http.get<IBaseResponseArray<any>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<any> {
    const res = await this.http.get<any>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<any, 'id'>): Promise<any> {
    const res = await this.http.post<any>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    const res = await this.http.patch<any>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const anyApi = new anyService();

