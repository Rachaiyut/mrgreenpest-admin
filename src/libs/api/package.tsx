// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '../common/interface/entity/base.interface';

// Interface
import { IProduct } from '../common/interface/entity/product.interface';

// Service
import { AuthService } from './auth';

class PackageService extends AuthService {
  protected path = '/package';

  // Your Public API Methods
  async getPackages(query: IBaseQuery): Promise<IBaseResponseArray<IProduct>> {
    const res = await this.http.get<IBaseResponseArray<IProduct>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getPackageById(id: string): Promise<IProduct> {
    const res = await this.http.get<IProduct>(`${this.path}/${id}`);
    return res.data;
  }

  async createPackage(data: Partial<IProduct>): Promise<IProduct> {
    const res = await this.http.post<IProduct>(`${this.path}`, data);
    return res.data;
  }

  async updatePackage(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const res = await this.http.patch<IProduct>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deletePackage(id: string): Promise<IProduct> {
    const res = await this.http.delete<IProduct>(`${this.path}/${id}`);
    return res.data;
  }
}

export const Package = new PackageService();
