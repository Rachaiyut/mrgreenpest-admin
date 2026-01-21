import { IBaseQuery, IBaseResponseArray } from '@/src/types/entity/base.interface';
import { FieldJob } from '@/src/types/entity/field-job.interface';
import { AuthService } from './auth';

class JobService extends AuthService {
  protected path = '/jobs';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<FieldJob>> {
    const res = await this.http.get<IBaseResponseArray<FieldJob>>(this.path, { params: query });
    return res.data;
  }
  
  async getById(id: string): Promise<FieldJob> {
    const res = await this.http.get<FieldJob>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<FieldJob, 'id'>): Promise<FieldJob> {
    const res = await this.http.post<FieldJob>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<FieldJob>): Promise<FieldJob> {
    const res = await this.http.patch<FieldJob>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const JobApi = new JobService();
