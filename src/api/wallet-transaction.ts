import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { WalletTransaction } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class WalletTransactionService extends AuthService {
  protected path = '/wallet-transactions';

  async getAll(
    query?: IBaseQuery
  ): Promise<IBaseResponseArray<WalletTransaction>> {
    const res = await this.http.get<IBaseResponseArray<WalletTransaction>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<WalletTransaction> {
    const res = await this.http.get<WalletTransaction>(`${this.path}/${id}`);
    return res.data;
  }

  async create(
    data: Omit<WalletTransaction, 'id'>
  ): Promise<WalletTransaction> {
    const res = await this.http.post<WalletTransaction>(this.path, data);
    return res.data;
  }

  async update(
    id: string,
    data: Partial<WalletTransaction>
  ): Promise<WalletTransaction> {
    const res = await this.http.patch<WalletTransaction>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const WalletTransactionApi = new WalletTransactionService();

