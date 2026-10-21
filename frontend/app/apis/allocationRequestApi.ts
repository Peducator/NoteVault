import { apiFetch } from './client';

export interface AllocationRequestItem {
  id: number;
  tenantId: number;
  requesterUserId: number;
  destinationUnitId: number;
  currentReviewUnitId: number;
  fundedByUnitId?: number | null;
  fundedByUserId?: number | null;
  rejectedByUnitId?: number | null;
  rejectedByUserId?: number | null;
  amount: string | number;
  reason: string;
  status: 'PENDING' | 'ALLOCATING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  lockedByUserId?: number | null;
  lockedAt?: string | null;
  lockExpiresAt?: string | null;
  endorsementChain?: any[];
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  requesterUser?: {
    id: number;
    name: string;
    email: string;
  };
  destinationUnit?: {
    id: number;
    name: string;
  };
  currentReviewUnit?: {
    id: number;
    name: string;
  };
  fundedByUnit?: {
    id: number;
    name: string;
  };
  fundedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  rejectedByUnit?: {
    id: number;
    name: string;
  };
  rejectedByUser?: {
    id: number;
    name: string;
    email: string;
  };
  lockedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CreateRequestPayload {
  destinationUnitId: number;
  amount: number | string;
  reason: string;
}

export interface ApproveAndFundPayload {
  confirmation: string; // Phải là 'CONFIRM'
  note?: string;
}

export const allocationRequestApi = {
  /**
   * Tạo yêu cầu xin cấp thêm ngân sách lên đơn vị Cha trực tiếp
   */
  async createRequest(payload: CreateRequestPayload): Promise<{ success: boolean; data: AllocationRequestItem; message?: string }> {
    return apiFetch('/api/allocations/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy danh sách các yêu cầu xin cấp ngân sách (hỗ trợ phân trang, lọc theo status, unitId)
   */
  async getRequests(params?: { status?: string; unitId?: number; page?: number; limit?: number }): Promise<{
    success: boolean;
    data: {
      requests: AllocationRequestItem[];
      pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    } | AllocationRequestItem[];
  }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.unitId) query.append('unitId', params.unitId.toString());
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch(`/api/allocations/requests${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết yêu cầu kèm Audit Trail & thông tin trạng thái khóa
   */
  async getRequestById(id: number): Promise<{ success: boolean; data: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Khóa tiến trình thanh toán (Atomic CAS Lock - TTL 5 phút chống race condition giữa CTO và subCTO)
   */
  async lockRequest(id: number): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/lock`, {
      method: 'POST',
    });
  },

  /**
   * Hủy khóa xử lý, đưa yêu cầu về trạng thái PENDING
   */
  async unlockRequest(id: number): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/unlock`, {
      method: 'POST',
    });
  },

  /**
   * Duyệt & Chuyển tiếp (Leo thang - Escalate) yêu cầu lên cấp trên (Grandparent)
   */
  async forwardRequest(id: number, note?: string): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/forward`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  /**
   * Phê duyệt & Rót tiền trực tiếp từ két có tiền (Yêu cầu nhập từ khóa 'CONFIRM')
   */
  async approveAndFundRequest(id: number, payload: ApproveAndFundPayload): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Từ chối yêu cầu kèm lý do bắt buộc và ghi nhận minh bạch vào Audit Trail
   */
  async rejectRequest(id: number, reason: string): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Hủy yêu cầu bởi chính người tạo khi còn ở trạng thái PENDING
   */
  async cancelRequest(id: number): Promise<{ success: boolean; message?: string; data?: AllocationRequestItem }> {
    return apiFetch(`/api/allocations/requests/${id}/cancel`, {
      method: 'POST',
    });
  },
};
