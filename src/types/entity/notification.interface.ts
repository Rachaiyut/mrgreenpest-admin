export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}
