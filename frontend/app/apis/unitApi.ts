import { apiFetch } from './client';
import { Unit } from '../types/expense';

export interface CreateUnitPayload {
  name: string;
  parentId?: number | null;
  ownerId?: number;
  allowCreateSubUnit?: boolean;
  allowMemberViewBalance?: boolean;
}

export interface UpdateUnitPayload {
  name?: string;
  ownerId?: number;
  allowCreateSubUnit?: boolean;
  allowMemberViewBalance?: boolean;
}

export interface UnitMemberItem {
  id: number;
  name: string;
  email: string;
  role: 'ROOT' | 'ADMIN' | 'MEMBER';
  unitMemberRole?: 'EDIT' | 'VIEWER';
  isOwner?: boolean;
  joinedAt?: string;
}

export const unitApi = {
  /**
   * Lấy toàn bộ cây đơn vị của doanh nghiệp (kèm số dư an toàn và quan hệ cha-con)
   */
  async getUnitTree(): Promise<{ success: boolean; data: { flat: Unit[]; tree: Unit[] } | Unit[] }> {
    return apiFetch('/api/units', {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết một đơn vị theo ID
   */
  async getUnitById(id: number): Promise<{ success: boolean; data: Unit }> {
    return apiFetch(`/api/units/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy số dư an toàn tức thời (safeBalance) của đơn vị
   */
  async getUnitBalance(id: number): Promise<{ success: boolean; data: { unitId: number; name: string; safeBalance: string | number } }> {
    return apiFetch(`/api/units/${id}/balance`, {
      method: 'GET',
    });
  },

  /**
   * Lấy danh sách thành viên trong đơn vị (kèm vai trò EDIT / VIEWER và isOwner)
   */
  async getUnitMembers(id: number): Promise<{ success: boolean; data: UnitMemberItem[] }> {
    return apiFetch(`/api/units/${id}/members`, {
      method: 'GET',
    });
  },

  /**
   * Tạo đơn vị con mới (trực thuộc đơn vị cha)
   */
  async createUnit(payload: CreateUnitPayload): Promise<{ success: boolean; data: Unit; message?: string }> {
    return apiFetch('/api/units', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Cập nhật thông tin đơn vị (đổi tên, bổ nhiệm người quản lý, bật/tắt quyền tạo nest)
   */
  async updateUnit(id: number, payload: UpdateUnitPayload): Promise<{ success: boolean; data: Unit; message?: string }> {
    return apiFetch(`/api/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Thêm/kết nạp nhân viên vào đơn vị với phân quyền EDIT (Đồng quản lý/subCTO) hoặc VIEWER
   */
  async addMember(unitId: number, userId: number, role: 'EDIT' | 'VIEWER' = 'VIEWER'): Promise<{ success: boolean; data: any; message?: string }> {
    return apiFetch(`/api/units/${unitId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    });
  },

  /**
   * Gỡ nhân viên ra khỏi đơn vị
   */
  async removeMember(unitId: number, userId: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiFetch(`/api/units/${unitId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Xóa đơn vị trống (chỉ xóa được khi không có đơn vị con, không có dòng tiền cấp, không có chi tiêu)
   */
  async deleteUnit(id: number): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/units/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Xem trước phân tích tái cấu trúc đơn vị
   */
  async previewReorganize(id: number, targetParentId: number): Promise<{ success: boolean; data: any }> {
    return apiFetch(`/api/units/${id}/reorganize/preview`, {
      method: 'POST',
      body: JSON.stringify({ targetParentId }),
    });
  },

  /**
   * Xác nhận thực thi tái cấu trúc đơn vị
   */
  async confirmReorganize(id: number, payload: { targetParentId: number; strategy: 'SHARED_CHILDREN' | 'FULL_ISOLATION' }): Promise<{ success: boolean; message: string; data?: any }> {
    return apiFetch(`/api/units/${id}/reorganize/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
