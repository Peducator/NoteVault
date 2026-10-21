'use client';

import React, { useState } from 'react';
import { UserCheck, UserX, Clock, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { JoinRequest, Unit } from '../../types/expense';

interface JoinRequestsTabProps {
  joinRequests: JoinRequest[];
  units: Unit[];
  onApprove: (requestId: string, role: 'MEMBER' | 'ROOT', unitId?: number) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}

export const JoinRequestsTab: React.FC<JoinRequestsTabProps> = ({
  joinRequests,
  units,
  onApprove,
  onReject,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [approveRole, setApproveRole] = useState<'MEMBER' | 'ROOT'>('MEMBER');
  const [approveUnitId, setApproveUnitId] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenApproveModal = (req: JoinRequest) => {
    setSelectedRequest(req);
    setApproveRole('MEMBER');
    setApproveUnitId(req.unitId || undefined);
  };

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return;
    try {
      setIsSubmitting(true);
      await onApprove(selectedRequest.requestId, approveRole, approveUnitId);
      setSelectedRequest(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Hàng Đợi Đơn Xin Gia Nhập Doanh Nghiệp
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Xét duyệt nhân viên mới đăng ký và phân bổ trực tiếp vào phòng ban
        </p>
      </div>

      {/* List */}
      {joinRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Không có đơn xin gia nhập nào đang chờ</p>
          <p className="text-xs text-zinc-400 mt-1">Toàn bộ nhân sự đã được xét duyệt hoàn tất</p>
        </div>
      ) : (
        <div className="space-y-3">
          {joinRequests.map((req) => (
            <div
              key={req.requestId}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {req.name}
                  </span>
                  <span className="text-xs text-zinc-400">({req.email})</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Ngày nộp: {new Date(req.createdAt).toLocaleDateString('vi-VN')}</span>
                  {req.department && (
                    <>
                      <span>•</span>
                      <span>Đề xuất: {req.department}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleOpenApproveModal(req)}
                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Duyệt</span>
                </button>
                <button
                  onClick={() => onReject(req.requestId)}
                  className="h-8 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Duyệt nhân viên {selectedRequest.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Chỉ định đơn vị trực thuộc và cấp quyền tài khoản ban đầu
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Đơn vị trực thuộc
                </label>
                <select
                  value={approveUnitId || ''}
                  onChange={(e) => setApproveUnitId(Number(e.target.value) || undefined)}
                  className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">-- Để trống (Nhân viên tự do) --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Quyền hạn công ty
                </label>
                <select
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as any)}
                  className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="MEMBER">MEMBER (Nhân viên)</option>
                  <option value="ROOT">ROOT (Quản trị cấp cao)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="h-10 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-xs"
              >
                {isSubmitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
