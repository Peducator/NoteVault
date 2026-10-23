import { apiFetch } from './client';

export interface BankingAccount {
  id: number;
  userId: number;
  tenantId?: number;
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBankingPayload {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isDefault?: boolean;
}

export const bankingApi = {
  /**
   * Lấy danh sách tài khoản ngân hàng của cá nhân
   */
  async getAccounts(): Promise<{ success: boolean; data: BankingAccount[] }> {
    return apiFetch('/api/banking', {
      method: 'GET',
    });
  },

  /**
   * Thêm mới tài khoản ngân hàng
   */
  async createAccount(payload: CreateBankingPayload): Promise<{ success: boolean; data: BankingAccount }> {
    return apiFetch('/api/banking', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Cập nhật thông tin tài khoản
   */
  async updateAccount(id: number, payload: Partial<CreateBankingPayload>): Promise<{ success: boolean; data: BankingAccount }> {
    return apiFetch(`/api/banking/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xóa tài khoản ngân hàng
   */
  async deleteAccount(id: number): Promise<{ success: boolean; message: string }> {
    return apiFetch(`/api/banking/${id}`, {
      method: 'DELETE',
    });
  },
};
