import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { IndirectExpense } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class IndirectExpenseService extends AuthService {
  protected path = '/indirect-expenses';

  async getAll(
    query?: IBaseQuery
  ): Promise<IBaseResponseArray<IndirectExpense>> {
    const res = await this.http.get<IBaseResponseArray<IndirectExpense>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<IndirectExpense> {
    const res = await this.http.get<IndirectExpense>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<IndirectExpense, 'id'>): Promise<IndirectExpense> {
    const res = await this.http.post<IndirectExpense>(this.path, data);
    return res.data;
  }

  async update(
    id: string,
    data: Partial<IndirectExpense>
  ): Promise<IndirectExpense> {
    const res = await this.http.patch<IndirectExpense>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const IndirectExpenseApi = new IndirectExpenseService();
