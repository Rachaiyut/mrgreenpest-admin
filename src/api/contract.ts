import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Contract } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class ContractService extends AuthService {
  protected path = '/contracts';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Contract>> {
    const res = await this.http.get<IBaseResponseArray<Contract>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Contract> {
    const res = await this.http.get<Contract>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Contract, 'id'>): Promise<Contract> {
    const res = await this.http.post<Contract>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    const res = await this.http.patch<Contract>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async renew(id: string, data: Omit<Contract, 'id'>): Promise<Contract> {
    const res = await this.http.post<Contract>(`${this.path}/${id}/renew`, data);
    return res.data;
  }

  async getPdf(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const ContractApi = new ContractService();
