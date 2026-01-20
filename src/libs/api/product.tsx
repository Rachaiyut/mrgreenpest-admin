// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '../common/interface/entity/base.interface';

// Interface
import { IProduct } from '../common/interface/entity/product.interface';

// Service
import { AuthService } from './auth';

class ProductService extends AuthService {
  protected path = '/products';

  // Your Public API Methods
  async getProducts(
    query: IBaseQuery
  ): Promise<IBaseResponseArray<IProduct>> {
    const res = await this.http.get<IBaseResponseArray<IProduct>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getProductById(id: string): Promise<IProduct> {
    const res = await this.http.get<IProduct>(`${this.path}/${id}`);
    return res.data;
  }

  async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    const res = await this.http.post<IProduct>(`${this.path}`, data);
    return res.data;
  }

  async updateProduct(
    id: string,
    data: Partial<IProduct>
  ): Promise<IProduct> {
    const res = await this.http.patch<IProduct>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteProduct(id: string): Promise<IProduct> {
    const res = await this.http.delete<IProduct>(`${this.path}/${id}`);
    return res.data;
  }
}

export const Product = new ProductService();
