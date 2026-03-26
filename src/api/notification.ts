import { AuthService } from './auth';
import {
  IBaseQuery,
  IBaseResponseArray,
  IBaseResponse,
} from '@/src/types/entity/base.interface';

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  related_entity_id?: string;
  related_entity_type?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilterNotification extends IBaseQuery {
  recipient_id?: string;
  is_read?: boolean;
  type?: string;
}

export interface NotificationListResponse extends IBaseResponseArray<Notification> {
  unread_count?: number;
}

class NotificationService extends AuthService {
  protected path = '/notifications';

  async getAll(query?: FilterNotification): Promise<NotificationListResponse> {
    const res = await this.http.get<any>(this.path, {
      params: query,
    });

    const payload = res.data?.data || {};

    return {
      data: (payload.items || []) as Notification[],
      meta: payload.meta || {},
      // keep optional unread_count extension if backend adds it later
      unread_count: (payload.meta && (payload.meta as any).unread_count) ?? undefined,
    } as NotificationListResponse;
  }

  async markAsRead(id: string): Promise<IBaseResponse<Notification>> {
    const res = await this.http.patch<IBaseResponse<Notification>>(
      `${this.path}/${id}/read`
    );
    return res.data;
  }

  async markAllAsRead(): Promise<IBaseResponse<{ success: boolean }>> {
    const res = await this.http.patch<IBaseResponse<{ success: boolean }>>(
      `${this.path}/read-all`
    );
    return res.data;
  }

  async getDashboardData(params?: {
    page?: number;
    limit?: number;
    search?: string;
    filter_type?: string;
    start_date?: string;
    end_date?: string;
    invoice_status?: string;
  }): Promise<any> {
    const res = await this.http.get<any>(
      `${this.path}/dashboard`,
      { params }
    );
    return res.data;
  }
}

export const NotificationApi = new NotificationService();
