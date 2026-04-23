import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Withdrawal } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class IssueNoteService extends AuthService {
  protected path = '/issue-note';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Withdrawal>> {
    const res = await this.http.get<IBaseResponseArray<Withdrawal>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Withdrawal> {
    const res = await this.http.get<Withdrawal>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Withdrawal, 'id'>): Promise<Withdrawal> {
    const res = await this.http.post<Withdrawal>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Withdrawal>): Promise<Withdrawal> {
    const res = await this.http.patch<Withdrawal>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async approve(
    id: string,
    dto: {
      status: 'APPROVED' | 'REJECTED';
      remark?: string;
      category?: 'STOCK' | 'EXPENSE';
    },
  ): Promise<Withdrawal> {
    const res = await this.http.patch<Withdrawal>(`${this.path}/${id}/approve`, dto);
    return res.data;
  }
}

export const IssueNoteApi = new IssueNoteService();
