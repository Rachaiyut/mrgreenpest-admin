import { AuthService } from '../auth';
import { Transfer } from '@/src/types/entity/app.interface';
import {
  IBaseQuery,
  IBaseResponse,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

class TransferService extends AuthService {
  protected path = '/transfers';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Transfer>> {
    const res = await this.http.get<IBaseResponseArray<Transfer>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async create(
    data: Omit<Transfer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transfer> {
    const res = await this.http.post<IBaseResponse<Transfer>>(this.path, data);
    return res.data.data;
  }

  async updateStatus(id: string, status: string): Promise<Transfer> {
    const res = await this.http.patch<IBaseResponse<Transfer>>(
      `${this.path}/${id}/status`,
      { status }
    );
    return res.data.data;
  }
}

export const TransferApi = new TransferService();
