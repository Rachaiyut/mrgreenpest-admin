import {
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { User, UserQuery } from '@/src/types/entity/core.interface';
import { AuthService } from './auth';

class UserService extends AuthService {
  protected path = '/users';

  async getAll(query?: UserQuery): Promise<IBaseResponseArray<User>> {
    const res = await this.http.get<IBaseResponseArray<User>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<User> {
    const res = await this.http.get<User>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const res = await this.http.post<User>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const res = await this.http.patch<User>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const UserApi = new UserService();

