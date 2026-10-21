import { apiFetch } from './client';
import { Allocation } from '../types/expense';
import { allocationRequestApi } from './allocationRequestApi';

export interface CreateAllocationPayload {
  sourceUnitId?: number | null;
  targetUnitId: number;
  amount: number | string;
  note?: string;
}

export interface RecallAllocationPayload {
  sourceUnitId: number;
  targetUnitId: number;
  amount: number | string;
  reason?: string;
  note?: string;
}

export const allocationApi = {
  /**
   * Tạo giao dịch cấp phát ngân sách:
   * - Nạp vốn gốc: sourceUnitId = null (dành cho ROOT)
   * - Cấp từ cha xuống con hoặc chuyển ngân sách nội bộ: sourceUnitId != null
   */
  async createAllocation(payload: CreateAllocationPayload): Promise<{ success: boolean; data: Allocation; message?: string }> {
    return apiFetch('/api/allocations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Thu hồi ngân sách từ đơn vị con rút ngược về đơn vị cha cấp trên
   * - sourceUnitId: Đơn vị con (nơi bị thu hồi)
   * - targetUnitId: Đơn vị cha (nơi nhận lại tiền)
   * - amount: Số tiền thu hồi (không được vượt quá safeBalance hiện có của đơn vị con)
   */
  async recallAllocation(payload: RecallAllocationPayload): Promise<{ success: boolean; data: Allocation; message?: string }> {
    return apiFetch('/api/allocations/recall', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        reason: payload.reason || payload.note || 'Thu hồi điều chỉnh ngân sách',
      }),
    });
  },

  /**
   * Lấy lịch sử sổ cái các lần cấp tiền và thu hồi (hỗ trợ lọc theo unitId)
   */
  async getAllocations(params?: { unitId?: number; sourceUnitId?: number; targetUnitId?: number }): Promise<{ success: boolean; data: Allocation[] }> {
    const query = new URLSearchParams();
    if (params?.unitId) query.append('unitId', params.unitId.toString());
    if (params?.sourceUnitId) query.append('sourceUnitId', params.sourceUnitId.toString());
    if (params?.targetUnitId) query.append('targetUnitId', params.targetUnitId.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/allocations${qs}`, {
      method: 'GET',
    });
  },

  // Backward compatibility re-exports from allocationRequestApi:
  createRequest: allocationRequestApi.createRequest,
  getRequests: allocationRequestApi.getRequests,
  getRequestById: allocationRequestApi.getRequestById,
  lockRequest: allocationRequestApi.lockRequest,
  unlockRequest: allocationRequestApi.unlockRequest,
  forwardRequest: allocationRequestApi.forwardRequest,
  approveAndFundRequest: allocationRequestApi.approveAndFundRequest,
  rejectRequest: allocationRequestApi.rejectRequest,
  cancelRequest: allocationRequestApi.cancelRequest,
};
