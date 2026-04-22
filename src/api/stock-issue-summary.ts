import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { StockIssueSummary } from '@/src/types/entity/inventory.interface';
import { AuthService } from './auth';

class StockIssueSummaryService extends AuthService {
  protected path = '/stock-issue-summaries';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<StockIssueSummary>> {
    const res = await this.http.get<IBaseResponseArray<StockIssueSummary>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<StockIssueSummary> {
    const res = await this.http.get<StockIssueSummary>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<StockIssueSummary, 'id'>): Promise<StockIssueSummary> {
    const res = await this.http.post<StockIssueSummary>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<StockIssueSummary>): Promise<StockIssueSummary> {
    const res = await this.http.patch<StockIssueSummary>(`${this.path}/${id}`, data);
    return res.data;
  }

  async updateStatus(id: string, status: string): Promise<StockIssueSummary> {
    const res = await this.http.patch<StockIssueSummary>(`${this.path}/${id}/status`, { status });
    return res.data;
  }

  async approve(
    id: string,
    payload: {
      status: 'APPROVED' | 'REJECTED';
      remark?: string;
      category?: 'STOCK' | 'EXPENSE';
    },
  ): Promise<StockIssueSummary> {
    const res = await this.http.patch<StockIssueSummary>(`${this.path}/${id}/approve`, payload);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const StockIssueSummaryApi = new StockIssueSummaryService();
