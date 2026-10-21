import { apiFetch } from './client';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

export const notificationApi = {
  /**
   * Lấy danh sách thông báo của người dùng hiện tại
   */
  async getNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }): Promise<{
    success: boolean;
    data: {
      notifications: NotificationItem[];
      unreadCount: number;
    } | NotificationItem[];
  }> {
    const query = new URLSearchParams();
    if (params?.unreadOnly) query.append('unreadOnly', 'true');
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/notifications${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Đánh dấu một thông báo đã đọc
   */
  async markAsRead(id: number): Promise<{ success: boolean; data?: any }> {
    return apiFetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Đánh dấu toàn bộ thông báo đã đọc
   */
  async markAllAsRead(): Promise<{ success: boolean; data?: any }> {
    return apiFetch('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
