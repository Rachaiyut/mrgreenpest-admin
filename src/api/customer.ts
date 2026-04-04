import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Customer, CustomerQuery } from '@/src/types/entity/customer.interface';
import { AuthService } from './auth';

class CustomerService extends AuthService {
  protected path = '/customer';

  async getCustomers(
    query?: CustomerQuery
  ): Promise<IBaseResponseArray<Customer>> {
    const res = await this.http.get<IBaseResponseArray<Customer>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getCustomersService(
    query?: CustomerQuery
  ): Promise<IBaseResponseArray<Customer>> {
    const res = await this.http.get<IBaseResponseArray<Customer>>(
      `${this.path}/service`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getCustomerById(id: string): Promise<Customer> {
    const res = await this.http.get<Customer>(`${this.path}/${id}`);
    return res.data;
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'code'>): Promise<Customer> {
    const res = await this.http.post<Customer>(`${this.path}`, customerData);
    return res.data;
  }

  async updateCustomer(
    id: string,
    customerData: Partial<Customer>
  ): Promise<Customer> {
    const res = await this.http.patch<Customer>(
      `${this.path}/${id}`,
      customerData
    );
    return res.data;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async generatePortalToken(customerId: string): Promise<{ token: string; expires_at: string }> {
    const res = await this.http.post<{ data: { token: string; expires_at: string } }>(`${this.path}/${customerId}/portal-token`);
    return res.data.data;
  }
}

export const CustomerApi = new CustomerService();
