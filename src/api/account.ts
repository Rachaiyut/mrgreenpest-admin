import {
  IBaseQuery,
  IBaseResponse,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import {
  Account,
  AccountTransaction,
  AccountTransactionType,
} from '@/src/types/entity/account.interface';
import { AuthService } from './auth';

export interface AccountFilterQuery extends IBaseQuery {
  account_type?: string;
  is_active?: boolean;
}

export interface AccountTransactionFilterQuery extends IBaseQuery {
  account_id?: string;
  type?: AccountTransactionType;
  start_date?: string;
  end_date?: string;
}

export interface CreateAccountTransactionPayload {
  type: AccountTransactionType;
  amount: number;
  transaction_date: string;
  reference_code?: string;
  reference_id?: string;
  description?: string;
}

class AccountService extends AuthService {
  protected path = '/accounts';

  async getAll(query?: AccountFilterQuery): Promise<IBaseResponseArray<Account>> {
    const res = await this.http.get<IBaseResponseArray<Account>>(this.path, { params: query });
    return res.data;
  }

  async getById(id: string): Promise<Account> {
    const res = await this.http.get<IBaseResponse<Account>>(`${this.path}/${id}`);
    return res.data.data;
  }

  async create(data: Omit<Account, 'id' | 'current_balance'> & { current_balance?: number }): Promise<Account> {
    const res = await this.http.post<IBaseResponse<Account>>(this.path, data);
    return res.data.data;
  }

  async update(id: string, data: Partial<Account>): Promise<Account> {
    const res = await this.http.patch<IBaseResponse<Account>>(`${this.path}/${id}`, data);
    return res.data.data;
  }

  async close(id: string): Promise<Account> {
    const res = await this.http.delete<IBaseResponse<Account>>(`${this.path}/${id}`);
    return res.data.data;
  }

  async setActive(id: string, isActive: boolean): Promise<Account> {
    const res = await this.http.patch<IBaseResponse<Account>>(
      `${this.path}/${id}/active`,
      { is_active: isActive },
    );
    return res.data.data;
  }

  async getTransactions(
    query?: AccountTransactionFilterQuery,
  ): Promise<IBaseResponseArray<AccountTransaction>> {
    const res = await this.http.get<IBaseResponseArray<AccountTransaction>>(
      `${this.path}/transactions`,
      { params: query },
    );
    return res.data;
  }

  async getTransactionStats(
    query?: AccountTransactionFilterQuery,
  ): Promise<{ deposit: number; withdraw: number; deposit_count: number; withdraw_count: number; total_count: number }> {
    const res = await this.http.get<{ data: { deposit: number; withdraw: number; deposit_count: number; withdraw_count: number; total_count: number } }>(
      `${this.path}/transactions/stats`,
      { params: query },
    );
    return (res.data as { data: { deposit: number; withdraw: number; deposit_count: number; withdraw_count: number; total_count: number } }).data;
  }

  async createTransaction(
    accountId: string,
    payload: CreateAccountTransactionPayload,
  ): Promise<AccountTransaction> {
    const res = await this.http.post<IBaseResponse<AccountTransaction>>(
      `${this.path}/${accountId}/transactions`,
      payload,
    );
    return res.data.data;
  }

  async deleteTransaction(trxId: string): Promise<{ deleted: boolean }> {
    const res = await this.http.delete<IBaseResponse<{ deleted: boolean }>>(
      `${this.path}/transactions/${trxId}`,
    );
    return res.data.data;
  }
}

export const AccountApi = new AccountService();
