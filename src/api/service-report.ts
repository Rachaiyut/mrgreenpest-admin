import {
  IBaseQuery,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';

import { AuthService } from './auth';
import { ServiceReport } from '../types';

class ServiceReportService extends AuthService {
  protected path = '/service-report';

  async getAll(query?: IBaseQuery): Promise<IBaseResponseArray<ServiceReport>> {
    const res = await this.http.get<IBaseResponseArray<ServiceReport>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getServiceReportPdfById(id: string): Promise<Blob> {
    const res = await this.http.get<Blob>(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }

  async getById(id: string): Promise<ServiceReport> {
    const res = await this.http.get<ServiceReport>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: Omit<ServiceReport, 'id'>): Promise<ServiceReport> {
    const res = await this.http.post<ServiceReport>(this.path, data);
    return res.data;
  }

  async update(
    id: string,
    data: Partial<ServiceReport>
  ): Promise<ServiceReport> {
    const res = await this.http.patch<ServiceReport>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }
}

export const ServiceReportApi = new ServiceReportService();
