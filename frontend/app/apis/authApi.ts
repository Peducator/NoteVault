import { apiFetch } from './client';

export interface LoginParams {
  email: string;
  password: string;
}

export interface SignupParams {
  email: string;
  password: string;
  name?: string;
  companyName: string;
  taxCode?: string;
  address?: string;
  industry?: string;
  phone?: string;
}

export interface JoinTeamParams {
  email: string;
  password: string;
  name: string;
  tenantId: number;
  department?: string;
}

export interface CompanyItem {
  id: number;
  companyName: string;
  taxCode?: string | null;
  industry?: string | null;
}

export const authApi = {
  /**
   * Đăng nhập
   */
  async login(credentials: LoginParams) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });
    return res;
  },

  /**
   * Đăng ký doanh nghiệp mới
   */
  async signup(data: SignupParams) {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    return res;
  },

  /**
   * Ứng viên gửi đơn xin gia nhập công ty (lưu tạm Redis 3 ngày)
   */
  async joinTeam(data: JoinTeamParams) {
    const res = await apiFetch('/api/auth/join-team', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
    return res;
  },

  /**
   * Lấy danh sách doanh nghiệp có sẵn từ Database
   */
  async getCompanies(): Promise<{ success: boolean; data: CompanyItem[] }> {
    const res = await apiFetch('/api/auth/companies', {
      method: 'GET',
      skipAuth: true,
    });
    return res;
  },

  /**
   * Làm mới Access Token bằng Refresh Token
   */
  async refreshAccessToken(refreshToken: string) {
    const res = await apiFetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    });
    return res;
  },

  /**
   * Đăng xuất: Thu hồi token trên Redis & dọn dẹp LocalStorage
   */
  async logout() {
    try {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('nv_access_token') : null;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('nv_refresh_token') : null;

      if (accessToken || refreshToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({
            accessToken,
            refreshToken,
          }),
        });
      }
    } catch {
      // Bỏ qua lỗi mạng khi logout để luôn dọn dẹp client
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nv_access_token');
        localStorage.removeItem('nv_refresh_token');
        localStorage.removeItem('nv_user');
        localStorage.removeItem('nv_cached_expenses');
      }
    }
  },
};
