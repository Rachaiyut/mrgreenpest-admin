import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Invoice, InvoiceSchedule } from '@/src/types/entity/financial.interface';
import { AuthService } from './auth';

class InvoiceService extends AuthService {
  protected path = '/invoices';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Invoice>> {
    const res = await this.http.get<IBaseResponseArray<Invoice>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getAllInvoiceSchedule(id: string): Promise<IBaseResponseArray<InvoiceSchedule>> {
    const res = await this.http.get<IBaseResponseArray<InvoiceSchedule>>(`${this.path}/${id}/invoice-schedules`);
    return res.data;
  }

  async getById(id: string): Promise<Invoice> {
    const res = await this.http.get<Invoice>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Invoice, 'id'>): Promise<Invoice> {
    const res = await this.http.post<Invoice>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const res = await this.http.patch<Invoice>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async exportPdf(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const InvoiceApi = new InvoiceService();
