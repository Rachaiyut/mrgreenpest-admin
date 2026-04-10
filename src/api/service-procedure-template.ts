// Constant
import {
  IBaseQuery,
  IBaseResponseArray,
  IBaseResponse,
} from '@/src/types/entity/base.interface';

// Service
import { AuthService } from './auth';

export interface IServiceProcedureTemplate {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  quotations?: {
    id: string;
    code: string;
    customer_name: string;
  }[];
}

export interface ICreateServiceProcedureTemplate {
  name: string;
  content: string;
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
}

export interface IUpdateServiceProcedureTemplate {
  name?: string;
  content?: string;
  is_active?: boolean;
  updated_by?: string;
}

class ServiceProcedureTemplateService extends AuthService {
  protected path = '/service-procedure-templates';

  async getAll(query: IBaseQuery): Promise<IBaseResponseArray<IServiceProcedureTemplate>> {
    const res = await this.http.get<IBaseResponseArray<IServiceProcedureTemplate>>(this.path, {
      params: query,
    });
    return res.data;
  }

  async getById(id: string): Promise<IBaseResponse<IServiceProcedureTemplate>> {
    const res = await this.http.get<IBaseResponse<IServiceProcedureTemplate>>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: ICreateServiceProcedureTemplate): Promise<IBaseResponse<IServiceProcedureTemplate>> {
    const res = await this.http.post<IBaseResponse<IServiceProcedureTemplate>>(this.path, data);
    return res.data;
  }

  async update(id: string, data: IUpdateServiceProcedureTemplate): Promise<IBaseResponse<IServiceProcedureTemplate>> {
    const res = await this.http.patch<IBaseResponse<IServiceProcedureTemplate>>(`${this.path}/${id}`, data);
    return res.data;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const res = await this.http.delete<{ success: boolean }>(`${this.path}/${id}`);
    return res.data;
  }

  async exportPdf(id: string): Promise<Blob> {
    const res = await this.http.get(`${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
    return res.data as Blob;
  }
}

export const ServiceProcedureTemplateApi = new ServiceProcedureTemplateService();
