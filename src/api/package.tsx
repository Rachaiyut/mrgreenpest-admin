// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

// Interface
import { Package } from '@/src/types/entity/package.interface';

// Service
import { AuthService } from './auth';

class PackageService extends AuthService {
  protected path = '/packages';

  // Your Public API Methods
  async getPackages(query: IBaseQuery): Promise<IBaseResponseArray<Package>> {
    const res = await this.http.get<IBaseResponseArray<Package>>(
      `${this.path}`,
      {
        params: query,
      }
    );
    return res.data;
  }

  async getPackageById(id: string): Promise<Package> {
    const res = await this.http.get<Package>(`${this.path}/${id}`);
    return res.data;
  }

  async createPackage(data: Partial<Package>): Promise<Package> {
    const res = await this.http.post<Package>(`${this.path}`, data);
    return res.data;
  }

  async updatePackage(id: string, data: Partial<Package>): Promise<Package> {
    const res = await this.http.patch<Package>(`${this.path}/${id}`, data);
    return res.data;
  }

  async deletePackage(id: string): Promise<Package> {
    const res = await this.http.delete<Package>(`${this.path}/${id}`);
    return res.data;
  }
}

export const PackageApi = new PackageService();
