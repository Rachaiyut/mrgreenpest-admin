import {
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { User, UserQuery } from '@/src/types/entity/core.interface';
import { AuthService } from './auth';

class UserService extends AuthService {
  protected path = '/users';

  async getAll(query?: UserQuery): Promise<IBaseResponseArray<User>> {
    const res = await this.http.get<any>(this.path, {
      params: query,
    });

    // Map users and compute the name property
    const mapUser = (u: any): User => ({
      ...u,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.nick_name || 'Unknown',
    });

    if (res.data && Array.isArray(res.data.data)) {
      return {
        ...res.data,
        data: res.data.data.map(mapUser),
      };
    }
    if (res.data && Array.isArray(res.data)) {
      return {
        status: 'success',
        success: true,
        data: res.data.map(mapUser),
      };
    }
    return res.data;
  }

  async getById(id: string): Promise<User> {
    const res = await this.http.get<User>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: any): Promise<User> {
    const res = await this.http.post<User>(this.path, data);
    return res.data;
  }

  async update(id: string, data: any): Promise<User> {
    const res = await this.http.patch<User>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const UserApi = new UserService();

