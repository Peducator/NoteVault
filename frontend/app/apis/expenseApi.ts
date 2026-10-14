import { apiFetch } from './client';

export interface CreateTransactionPayload {
  amount: number;
  categoryId?: number;
  categoryName?: string;
  note?: string;
  transactionDate?: string;
  scanStatus?: string;
  taxCode?: string;
  vendorName?: string;
  receiptUrl?: string;
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
   * Tạo giao dịch chi tiêu / hóa đơn mới
   */
  async createTransaction(payload: CreateTransactionPayload) {
    return apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount: payload.amount,
        categoryId: payload.categoryId || 1,
        note: payload.note || 'Chi phí công tác',
        transactionDate: payload.transactionDate || new Date().toISOString(),
        scanStatus: payload.scanStatus || 'CLEAN',
      }),
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
