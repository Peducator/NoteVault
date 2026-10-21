import { apiFetch } from './client';
import { JoinRequest, EmployeeUser, DepartmentOverviewItem, AdminContextData } from '../types/expense';

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN';
  department: string;
  employeeCode?: string;
}

export interface ApproveJoinRequestParams {
  role: 'USER' | 'ADMIN';
  department: string;
}

export interface UserProfile {
  id: number;
  uuid?: string;
  email: string;
  name?: string | null;
  employeeCode?: string | null;
  role: string;
  department?: string | null;
  tenantId?: number | null;
  tenant?: {
    id: number;
    uuid?: string;
    companyName: string;
    code?: string;
    taxCode?: string | null;
  } | null;
  companyName?: string;
  companyUuid?: string;
}

export const userApi = {
  /**
   * Lấy thông tin tài khoản người dùng hiện tại
   */
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    return apiFetch('/api/users/profile', {
      method: 'GET',
    });
  },

  /**
   * Cập nhật thông tin profile cá nhân
   */
  async updateProfile(data: { name?: string; department?: string }) {
    return apiFetch('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Lấy danh sách toàn bộ nhân viên chính thức trong công ty (Admin only)
   */
  async getUsers(): Promise<{ success: boolean; data: EmployeeUser[] }> {
    return apiFetch('/api/users', {
      method: 'GET',
    });
  },

  /**
   * Alias cho getUsers()
   */
  async getEmployees(): Promise<{ success: boolean; data: EmployeeUser[] }> {
    return userApi.getUsers();
  },

  /**
   * Admin tạo người dùng mới trực tiếp
   */
  async createUser(data: CreateUserParams): Promise<{ success: boolean; data: EmployeeUser }> {
    return apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Xóa mềm (khóa) tài khoản người dùng (Admin only)
   */
  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy danh sách đơn gia nhập đang chờ duyệt từ Redis (Admin only)
   */
  async getJoinRequests(): Promise<{ success: boolean; data: JoinRequest[] }> {
    return apiFetch('/api/users/join-requests', {
      method: 'GET',
    });
  },

  /**
   * Phê duyệt đơn gia nhập: gán Role, gán Phòng ban và đẩy vào DB (Admin only)
   */
  async approveJoinRequest(
    requestId: string,
    roleOrData: 'USER' | 'ADMIN' | 'ROOT' | 'MEMBER' | ApproveJoinRequestParams,
    departmentOrUnitId?: string | number
  ) {
    let payload: any = {};
    if (typeof roleOrData === 'object') {
      payload = roleOrData;
    } else {
      payload = {
        role: roleOrData === 'ROOT' ? 'ADMIN' : 'USER',
        department: typeof departmentOrUnitId === 'string' ? departmentOrUnitId : 'Nhân sự',
        unitId: typeof departmentOrUnitId === 'number' ? departmentOrUnitId : undefined,
      };
    }

    return apiFetch(`/api/users/join-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Từ chối đơn gia nhập: xóa sạch khỏi Redis (0 byte rác DB) (Admin only)
   */
  async rejectJoinRequest(requestId: string) {
    return apiFetch(`/api/users/join-requests/${requestId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy tổng quan phòng ban và ngân sách phân bổ (Admin only)
   */
  async getDepartmentsOverview(): Promise<{ success: boolean; data: DepartmentOverviewItem[] }> {
    return apiFetch('/api/users/departments-overview', {
      method: 'GET',
    });
  },

  /**
   * Lấy dữ liệu ngữ cảnh Admin theo UUID doanh nghiệp và UUID quản trị viên (Dynamic Admin Route)
   */
  async getAdminContext(companyUuid: string, userUuid: string): Promise<{ success: boolean; data: AdminContextData }> {
    return apiFetch(`/api/users/admin-context/${companyUuid}/${userUuid}`, {
      method: 'GET',
    });
  },
};
