import { IBaseResponseArray } from '@/src/types/entity/base.interface';
import { User, UserQuery } from '@/src/types/entity/core.interface';
import { UserExpense } from '@/src/types/entity/user-expense.interface';
import { AuthService } from './auth';

interface UserWallet {
  id?: string;
  user_id: string;
  /** ยอดเบิกสะสม (used) = sum(INCOME) - sum(EXPENSE) */
  balance: number;
  expense_limit: number;
  total_expenses?: number;
  total_income?: number;
  total_expense?: number;
  /** เงินคงเหลือที่ยังเบิกได้ = expense_limit - balance */
  remaining?: number;
  transactions?: unknown[];
}

class UserService extends AuthService {
  protected path = '/users';

  async getAll(query?: UserQuery): Promise<IBaseResponseArray<User>> {
    const res = await this.http.get<IBaseResponseArray<User>>(this.path, {
      params: query,
    });

    const mapUser = (u: User): User => ({
      ...u,
      name:
        `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
        u.nick_name ||
        'Unknown',
      creditLimit: (u as unknown as Record<string, unknown>).expense_limit
        ? Number((u as unknown as Record<string, unknown>).expense_limit)
        : undefined,
    });

    if (res.data && Array.isArray(res.data.data)) {
      return {
        ...res.data,
        data: res.data.data.map(mapUser),
      };
    }
    return res.data;
  }

  async getById(id: string): Promise<User> {
    const res = await this.http.get<User>(`${this.path}/${id}`);
    const u = res.data;
    return {
      ...u,
      name:
        `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
        u.nick_name ||
        'Unknown',
      creditLimit: (u as unknown as Record<string, unknown>).expense_limit
        ? Number((u as unknown as Record<string, unknown>).expense_limit)
        : undefined,
    };
  }

  async create(data: Partial<User>): Promise<User> {
    const res = await this.http.post<User>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const res = await this.http.patch<User>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async getWallet(userId: string): Promise<UserWallet> {
    const res = await this.http.get<{ data: UserWallet }>(`${this.path}/${userId}/wallet`);
    return res.data.data;
  }

  async createExpense(userId: string, data: Partial<UserExpense>): Promise<UserExpense> {
    const res = await this.http.post<UserExpense>(`${this.path}/${userId}/expenses`, data);
    return res.data;
  }

  async checkLimit(
    userId: string,
    amount: number
  ): Promise<{
    isOverLimit: boolean;
    balance: number;
    limit: number;
    message: string;
  }> {
    const res = await this.http.post(
      `${this.path}/${userId}/expenses/check-limit`,
      { amount }
    );
    return res.data.data;
  }
}

export const UserApi = new UserService();
