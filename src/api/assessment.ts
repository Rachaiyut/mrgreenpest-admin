import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import { Assessment, AssessmentAction } from '@/src/types/entity/assessment.interface';
import { AuthService } from './auth';
import { AssessmentQuery } from '../types/query/assessment.interface';

class AssessmentService extends AuthService {
  protected path = '/assessments';

  async getAll(query?: AssessmentQuery): Promise<IBaseResponseArray<Assessment>> {
    const res = await this.http.get<IBaseResponseArray<Assessment>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<Assessment> {
    const res = await this.http.get<Assessment>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<Assessment, 'id'>): Promise<Assessment> {
    const res = await this.http.post<Assessment>(this.path, data);
    return res.data;
  }

  async update(id: string, data: Partial<Assessment>): Promise<Assessment> {
    const res = await this.http.patch<Assessment>(`${this.path}/${id}`, data);
    return res.data;
  }

  async exportPdf(id: string): Promise<Blob> {
    const res = await this.http.get<Blob>(`${this.path}/${id}/pdf`, {
      responseType: 'blob' as any,
    });
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async updateArea(areaId: string, data: Record<string, unknown>): Promise<unknown> {
    const res = await this.http.patch(`/assessment-areas/${areaId}`, data);
    return res.data;
  }

  async approveById(id: string, data: AssessmentAction): Promise<Assessment> {
    const res = await this.http.patch<Assessment>(`${this.path}/${id}/approve`, data);
    return res.data;
  }
}

export const AssessmentApi = new AssessmentService();
