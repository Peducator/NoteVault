import { apiFetch } from './client';

export interface CategoryItem {
  id: number;
  tenantId?: number;
  userId?: number;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export const categoryApi = {
  /**
   * Lấy danh sách danh mục thu/chi của doanh nghiệp
   */
  async getCategories(): Promise<{ success: boolean; data: CategoryItem[] }> {
    return apiFetch('/api/categories', {
      method: 'GET',
    });
  },

  /**
   * Tạo danh mục mới
   */
  async createCategory(payload: { name: string; description?: string; color?: string; icon?: string }): Promise<{ success: boolean; data: CategoryItem }> {
    return apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Cập nhật danh mục
   */
  async updateCategory(id: number, payload: { name?: string; description?: string; color?: string; icon?: string }): Promise<{ success: boolean; data: CategoryItem }> {
    return apiFetch(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xóa danh mục
   */
  async deleteCategory(id: number): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
