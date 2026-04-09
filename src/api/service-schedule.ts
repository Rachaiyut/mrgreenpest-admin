import { AuthService } from './auth';

export interface ServiceScheduleDetailItem {
  id?: string;
  visit_no: number;
  month: string;
  work_task: string;
  service_details: string;
  sequence?: number;
}

export interface ServiceSchedule {
  id: string;
  name: string;
  package_id?: string;
  package?: { id: string; code: string; name: string };
  creator?: { id: string; first_name: string; last_name: string };
  details: ServiceScheduleDetailItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateServiceSchedulePayload {
  name: string;
  package_id?: string;
  details: ServiceScheduleDetailItem[];
}

class ServiceScheduleApiService extends AuthService {
  protected override path = '/service-schedules';

  async getAll(): Promise<ServiceSchedule[]> {
    const res = await this.http.get<{ data: ServiceSchedule[] }>(this.path);
    return res.data?.data || [];
  }

  async getById(id: string): Promise<ServiceSchedule> {
    const res = await this.http.get<{ data: ServiceSchedule }>(`${this.path}/${id}`);
    return res.data?.data;
  }

  async create(data: CreateServiceSchedulePayload): Promise<ServiceSchedule> {
    const res = await this.http.post<{ data: ServiceSchedule }>(this.path, data);
    return res.data?.data;
  }

  async update(id: string, data: CreateServiceSchedulePayload): Promise<ServiceSchedule> {
    const res = await this.http.patch<{ data: ServiceSchedule }>(`${this.path}/${id}`, data);
    return res.data?.data;
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async getPdf(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  }
}

export const ServiceScheduleApi = new ServiceScheduleApiService();
