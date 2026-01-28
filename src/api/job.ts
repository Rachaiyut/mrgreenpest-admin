import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { AuthService } from './auth';
import { Job } from '../types/entity/job.interface';

class JobService extends AuthService {
  protected path = '/jobs';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Job>> {
    const res = await this.http.get<IBaseResponseArray<Job>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Job> {
    const res = await this.http.get<Job>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Job, 'id'>): Promise<Job> {
    const res = await this.http.post<Job>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<any>): Promise<Job> {
    const res = await this.http.patch<any>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const JobApi = new JobService();

