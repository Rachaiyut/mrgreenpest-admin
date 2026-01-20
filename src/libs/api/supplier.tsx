// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '../common/interface/entity/base.interface';

// Interface
import { ISupplier } from '../common/interface/entity/supplier.interface';

// Service
import { AuthService } from './auth';

class SupplierService extends AuthService {
  protected path = '/suppliers';

  async getSuppliers(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<ISupplier>> {
    const res = await this.http.get<IBaseResponseArray<ISupplier>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getSupplierById(id: string): Promise<ISupplier> {
    const res = await this.http.get<ISupplier>(`${this.path}/${id}`);
    return res.data;
  }

  async createSupplier(
    supplierData: Omit<ISupplier, 'id'>
  ): Promise<ISupplier> {
    const res = await this.http.post<ISupplier>(`${this.path}`, supplierData);
    return res.data;
  }

  async updateSupplier(
    id: string,
    supplierData: Partial<ISupplier>
  ): Promise<ISupplier> {
    const res = await this.http.patch<ISupplier>(
      `${this.path}/${id}`,
      supplierData
    );
    return res.data;
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const Supplier = new SupplierService();
