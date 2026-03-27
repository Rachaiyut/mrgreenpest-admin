// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface

// Service
import { AuthService } from './auth';
import { Product } from '../types/entity/product.interface';

class ProductService extends AuthService {
  protected path = '/products';

  // Your Public API Methods
  async getProducts(query?: IBaseQuery): Promise<IBaseResponseArray<Product>> {
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

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const res = await this.http.patch<Product>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deleteProduct(id: string): Promise<Product> {
    const res = await this.http.delete<Product>(`${this.path}/${id}`);
    return res.data;
  }
}

export const ProductApi = new ProductService();

class ProductSvcService extends AuthService {
  protected path = '/product-service';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<any>> {
    const res = await this.http.get<IBaseResponseArray<any>>(this.path, { params: query });
    return res.data;
  }

  async getById(id: string): Promise<any> {
    const res = await this.http.get<any>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: any): Promise<any> {
    const res = await this.http.post<any>(this.path, data);
    return res.data;
  }

  async update(id: string, data: any): Promise<any> {
    const res = await this.http.patch<any>(`${this.path}/${id}`, data);
    return res.data;
  }

  async remove(id: string): Promise<any> {
    const res = await this.http.delete<any>(`${this.path}/${id}`);
    return res.data;
  }
}

export const ProductServiceApi = new ProductSvcService();
