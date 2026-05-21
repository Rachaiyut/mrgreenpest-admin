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

  async cancel(id: string): Promise<Invoice> {
    const res = await this.http.post<Invoice>(`${this.path}/${id}/cancel`, {});
    return res.data;
  }

  async exportPdf(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }

  // ===== Approval flow (new) =====

  /** Step 1: Admin reviews on-site collection + selects bank account.
   *  Optionally include tax_invoice payload to request tax invoice for an
   *  individual customer (admin enters name/address/tax_id manually). */
  async adminApprove(
    id: string,
    accountId: string,
    taxInvoice?: { name: string; address: string; tax_id: string },
  ): Promise<Invoice> {
    const res = await this.http.post<Invoice>(
      `${this.path}/${id}/admin-approve`,
      { account_id: accountId, tax_invoice: taxInvoice },
    );
    return res.data;
  }

  /** Step 2: Accounting/CFO finalizes — issues receipt + records DEPOSIT.
   *  Optionally override account_id if CFO wants to deposit to a different bank
   *  account than the one admin originally picked. */
  async accountingApprove(id: string, accountId?: string): Promise<Invoice> {
    const res = await this.http.post<Invoice>(
      `${this.path}/${id}/accounting-approve`,
      accountId ? { account_id: accountId } : {},
    );
    return res.data;
  }

  /** Reject during the approval flow (admin or CFO step). */
  async reject(id: string, reason: string): Promise<Invoice> {
    const res = await this.http.post<Invoice>(
      `${this.path}/${id}/reject`,
      { reason },
    );
    return res.data;
  }
}

export const InvoiceApi = new InvoiceService();
