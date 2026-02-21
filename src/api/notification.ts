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
    // The backend returns { data: items, meta: ..., unread_count: ... } wrapped in successWithData
    // which usually returns { data: items, meta: ... }
    // My controller returned: successWithData(items, { ...meta, unread_count })
    // So unread_count is in res.data.meta.unread_count

    // Check how IBaseResponseArray is defined.
    // If IBaseResponseArray<T> = { data: T[], meta: ... }
    return res.data;
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

  async getDashboardData(): Promise<IBaseResponse<any[]>> {
    const res = await this.http.get<IBaseResponse<any[]>>(
      `${this.path}/dashboard`
    );
    return res.data;
  }
}

export const NotificationApi = new NotificationService();
