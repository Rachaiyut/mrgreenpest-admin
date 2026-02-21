import { IBaseResponseArray } from '@/src/types/entity/base.interface';
import { AuthService } from './auth';

export interface Permission {
  id: string;
  name: string;
  group: string;
  description?: string;
  created_at?: string;
}

class PermissionService extends AuthService {
  protected path = '/permissions';

  async getAll(params?: any): Promise<IBaseResponseArray<Permission>> {
    const res = await this.http.get<IBaseResponseArray<Permission>>(this.path, {
      params,
    });
    return res.data;
  }
}

export const PermissionApi = new PermissionService();
