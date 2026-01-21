// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface
import { Supplier, SupplierQuery } from '@/src/types/entity/supplier.interface';

// Service
import { AuthService } from './auth';

class SupplierService extends AuthService {
  protected path = '/suppliers';

  async getSuppliers(
    query: SupplierQuery
  ): Promise<IBaseResponseArray<Supplier>> {
    const res = await this.http.get<IBaseResponseArray<Supplier>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getSupplierById(id: string): Promise<Supplier> {
    const res = await this.http.get<Supplier>(`${this.path}/${id}`);
    return res.data;
  }

  async createSupplier(
    supplierData: Omit<Supplier, 'id'>
  ): Promise<Supplier> {
    const res = await this.http.post<Supplier>(`${this.path}`, supplierData);
    return res.data;
  }

  async updateSupplier(
    id: string,
    supplierData: Partial<Supplier>
  ): Promise<Supplier> {
    const res = await this.http.patch<Supplier>(
      `${this.path}/${id}`,
      supplierData
    );
    return res.data;
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const SupplierApi = new SupplierService();
