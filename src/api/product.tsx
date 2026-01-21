// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface
import { Product } from '@/src/types/entity/package.interface';

// Service
import { AuthService } from './auth';

class ProductService extends AuthService {
  protected path = '/products';

  // Your Public API Methods
  async getProducts(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<Product>> {
    const res = await this.http.get<IBaseResponseArray<Product>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getProductById(id: string): Promise<Product> {
    const res = await this.http.get<Product>(`${this.path}/${id}`);
    return res.data;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const res = await this.http.post<Product>(`${this.path}`, data);
    return res.data;
  }

  async updateProduct(
    id: string,
    data: Partial<Product>
  ): Promise<Product> {
    const res = await this.http.patch<Product>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteProduct(id: string): Promise<Product> {
    const res = await this.http.delete<Product>(`${this.path}/${id}`);
    return res.data;
  }
}

export const ProductApi = new ProductService();
