import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Quotation } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class QuotationService extends AuthService {
  protected path = '/quotations';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Quotation>> {
    const res = await this.http.get<IBaseResponseArray<Quotation>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Quotation> {
    const res = await this.http.get<Quotation>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Quotation, 'id'>): Promise<Quotation> {
    const res = await this.http.post<Quotation>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Quotation>): Promise<Quotation> {
    const res = await this.http.patch<Quotation>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async getPDF(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const QuotationApi = new QuotationService();
