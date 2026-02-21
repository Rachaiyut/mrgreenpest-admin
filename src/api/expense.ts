import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Expense } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class ExpenseService extends AuthService {
  protected path = '/expenses';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Expense>> {
    const res = await this.http.get<IBaseResponseArray<Expense>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Expense> {
    const res = await this.http.get<Expense>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Expense, 'id'>): Promise<Expense> {
    const res = await this.http.post<Expense>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const res = await this.http.patch<Expense>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const ExpenseApi = new ExpenseService();
