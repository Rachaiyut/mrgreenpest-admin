import {
  IBaseQuery,
  IBaseResponse,
  IBaseResponseArray,
} from '@/src/types/entity/base.interface';
import {
  DailyJobClosure,
  DailyClosureOverviewItem,
  CreateDailyJobClosurePayload,
  CloseDailyJobClosurePayload,
} from '@/src/types/entity/daily-closure.interface';
import { AuthService } from './auth';

class DailyClosureService extends AuthService {
  protected path = '/daily-job-closures';

  async getAll(
    query?: IBaseQuery
  ): Promise<IBaseResponseArray<DailyJobClosure>> {
    const res = await this.http.get<IBaseResponseArray<DailyJobClosure>>(
      this.path,
      { params: query }
    );
    return res.data;
  }

  async getById(id: string): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.get<IBaseResponse<DailyJobClosure>>(
      `${this.path}/${id}`
    );
    return res.data;
  }

  async getSummary(id: string): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.get<IBaseResponse<DailyJobClosure>>(
      `${this.path}/${id}/summary`
    );
    return res.data;
  }

  async getToday(vehicleId: string): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.get<IBaseResponse<DailyJobClosure>>(
      `${this.path}/today/${vehicleId}`
    );
    return res.data;
  }

  async create(
    data: CreateDailyJobClosurePayload
  ): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.post<IBaseResponse<DailyJobClosure>>(
      this.path,
      data
    );
    return res.data;
  }

  async close(
    id: string,
    data: CloseDailyJobClosurePayload
  ): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.patch<IBaseResponse<DailyJobClosure>>(
      `${this.path}/${id}/close`,
      data
    );
    return res.data;
  }

  async closeRetroactive(
    id: string
  ): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.patch<IBaseResponse<DailyJobClosure>>(
      `${this.path}/${id}/close-retroactive`
    );
    return res.data;
  }

  async getOverview(date: string): Promise<IBaseResponse<DailyClosureOverviewItem[]>> {
    const res = await this.http.get<IBaseResponse<DailyClosureOverviewItem[]>>(
      `${this.path}/overview/${date}`
    );
    return res.data;
  }

  async update(
    id: string,
    data: Partial<DailyJobClosure>
  ): Promise<IBaseResponse<DailyJobClosure>> {
    const res = await this.http.patch<IBaseResponse<DailyJobClosure>>(
      `${this.path}/${id}`,
      data
    );
    return res.data;
  }
}

export const DailyClosureApi = new DailyClosureService();
