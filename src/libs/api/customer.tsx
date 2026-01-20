// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '../common/interface/entity/base.interface';

// Interface
import { ICustomer } from '../common/interface/entity/customer.interface';

// Service
import { AuthService } from './auth';

class CustomerService extends AuthService {
  protected path = '/customer';

  async getCustomers(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<ICustomer>> {
    const res = await this.http.get<IBaseResponseArray<ICustomer>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getCustomerById(id: string): Promise<ICustomer> {
    const res = await this.http.get<ICustomer>(`${this.path}/${id}`);
    return res.data;
  }

  async createCustomer(
    customerData: Omit<ICustomer, 'id'>
  ): Promise<ICustomer> {
    const res = await this.http.post<ICustomer>(`${this.path}`, customerData);
    return res.data;
  }

  async updateCustomer(
    id: string,
    customerData: Partial<ICustomer>
  ): Promise<ICustomer> {
    const res = await this.http.patch<ICustomer>(
      `${this.path}/${id}`,
      customerData
    );
    return res.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const Customer = new CustomerService();
