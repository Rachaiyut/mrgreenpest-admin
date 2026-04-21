import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { AuthService } from './auth';
import { Job } from '../types/entity/job.interface';
import { JobRejectionHistoryEntry } from '../types/entity/service-report.interface';

class JobService extends AuthService {
  protected path = '/jobs';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<Job>> {
    const res = await this.http.get<IBaseResponseArray<Job>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getAllUnassigned(query?: IBaseQuery): Promise<IBaseResponseArray<Job>> {
    const res = await this.http.get<IBaseResponseArray<Job>>(
      `${this.path}/unassigned`,
      {
        params: query,
      },
    );
    return res.data;
  }

  async getUnassignedCount(): Promise<number> {
    const res = await this.http.get<{ data: { count: number } }>(`${this.path}/unassigned/count`);
    return res.data?.data?.count || 0;
  }

  async getById(id: string): Promise<Job> {
    const res = await this.http.get<Job>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Job, 'id'>): Promise<Job> {
    const res = await this.http.post<Job>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Job>): Promise<Job> {
    const res = await this.http.patch<Job>(`${this.path}/${id}`, data);
    return res.data;
  }

  async checkIn(id: string): Promise<Job> {
    const res = await this.http.patch<Job>(`${this.path}/${id}/check-in`);
    return res.data;
  }

  async checkOut(id: string): Promise<Job> {
    const res = await this.http.patch<Job>(`${this.path}/${id}/check-out`);
    return res.data;
  }

  async approve(id: string): Promise<Job> {
    const res = await this.http.post<Job>(`${this.path}/${id}/approve`);
    return res.data;
  }

  async reject(id: string, reason: string): Promise<Job> {
    const res = await this.http.post<Job>(`${this.path}/${id}/reject`, { reason });
    return res.data;
  }

  async getRejectionHistory(id: string): Promise<JobRejectionHistoryEntry[]> {
    const res = await this.http.get<{ data: JobRejectionHistoryEntry[] }>(
      `${this.path}/${id}/rejection-history`,
    );
    return res.data?.data || [];
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const JobApi = new JobService();
