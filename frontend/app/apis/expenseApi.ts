import { apiFetch } from './client';

export interface CreateTransactionPayload {
  amount: number | string;
  categoryId?: number;
  categoryName?: string;
  unitId?: number;
  note?: string;
  transactionDate?: string;
  scanStatus?: string;
  taxCode?: string;
  vendorName?: string;
  receiptUrl?: string;
  s3Key?: string;
}

export interface OcrScanPayload {
  imageBase64: string;
  mimeType: string;
}

export const expenseApi = {
  /**
   * Lấy danh sách giao dịch hóa đơn
   */
  async getTransactions(limit = 50) {
    return apiFetch(`/api/transactions?limit=${limit}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết một giao dịch
   */
  async getTransactionById(id: string | number) {
    return apiFetch(`/api/transactions/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Tạo giao dịch chi tiêu / hóa đơn mới (yêu cầu unitId là đơn vị lá)
   */
  async createTransaction(payload: CreateTransactionPayload) {
    return apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount: payload.amount,
        categoryId: payload.categoryId || 1,
        unitId: payload.unitId,
        note: payload.note || 'Chi phí công tác',
        transactionDate: payload.transactionDate || new Date().toISOString(),
        scanStatus: payload.scanStatus || 'CLEAN',
        s3Key: payload.s3Key || payload.receiptUrl,
      }),
    });
  },

  /**
   * Phê duyệt khoản chi tiêu (Quản lý trực tiếp / Unit Owner duyệt)
   */
  async approveTransaction(id: string | number) {
    return apiFetch(`/api/transactions/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối khoản chi tiêu (Bắt buộc nhập lý do từ chối)
   */
  async rejectTransaction(id: string | number, reason: string) {
    return apiFetch(`/api/transactions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason: reason, reason }),
    });
  },

  /**
   * Hoàn ứng khoản chi tiêu (PAID - kế toán / Cha xác nhận đã thanh toán)
   */
  async payTransaction(id: string | number) {
    return apiFetch(`/api/transactions/${id}/pay`, {
      method: 'POST',
    });
  },

  /**
   * Lấy danh mục chi tiêu của công ty
   */
  async getCategories() {
    return apiFetch('/api/categories', {
      method: 'GET',
    });
  },

  /**
   * Tạo danh mục chi tiêu mới
   */
  async createCategory(payload: { name: string; type?: 'EXPENSE' | 'INCOME'; icon?: string }) {
    return apiFetch('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Quét hóa đơn OCR bằng AI
   */
  async scanInvoice(payload: OcrScanPayload) {
    return apiFetch('/api/ocr/scan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
