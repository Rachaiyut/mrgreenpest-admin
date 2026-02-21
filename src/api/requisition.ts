import { AuthService } from './auth';
import { IBaseResponseArray } from '../types/entity/base.interface';
import {
  Requisition,
  CreateRequisitionDto,
  UpdateRequisitionDto,
  ApproveRequisitionDto,
} from '../types/entity/requisition.interface';

class RequisitionService extends AuthService {
  protected path = '/requisitions';

  // Override to access the protected http instance
  public getHttp() {
    return this.http;
  }

  async getAll(params?: any): Promise<Requisition[]> {
    // If backend returns IBaseResponseArray, we need to extract data.
    // Based on typical NestJS patterns in this project, it seems direct array or wrapped.
    // Let's assume unwrapped array for now based on other services, or wrapped in 'data'.
    // Given the previous error context, let's look at how other APIs work.
    // But safely:
    const res = await this.http.get<any>(this.path, { params });
    // Check if it's paginated/wrapped
    if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return res.data;
  }

  async getById(id: string): Promise<Requisition> {
    const res = await this.http.get<Requisition>(`${this.path}/${id}`);
    return res.data;
  }

  async create(data: CreateRequisitionDto): Promise<Requisition> {
    const res = await this.http.post<Requisition>(this.path, data);
    return res.data;
  }

  async update(id: string, data: UpdateRequisitionDto): Promise<Requisition> {
    const res = await this.http.patch<Requisition>(`${this.path}/${id}`, data);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`${this.path}/${id}`);
  }

  async approve(id: string, data: ApproveRequisitionDto): Promise<Requisition> {
    const res = await this.http.patch<Requisition>(
      `${this.path}/${id}/approve`,
      data
    );
    return res.data;
  }
}

export const RequisitionApi = new RequisitionService();
