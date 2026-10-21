'use client';

import React, { useState } from 'react';
import {
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Coins,
  Filter,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { formatVND } from '../../lib/format';
import { AllocationRequestItem, allocationRequestApi } from '../../apis/allocationRequestApi';
import { Unit } from '../../types/expense';

interface AllocationRequestsTabProps {
  requests: AllocationRequestItem[];
  units: Unit[];
  currentUserId?: number;
  onRefresh: () => void;
  onOpenCreateRequestModal: () => void;
  onOpenFundModal: (req: AllocationRequestItem) => void;
  onToast: (msg: string, isError?: boolean) => void;
}

export const AllocationRequestsTab: React.FC<AllocationRequestsTabProps> = ({
  requests,
  units,
  currentUserId,
  onRefresh,
  onOpenCreateRequestModal,
  onOpenFundModal,
  onToast,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [rejectingReqId, setRejectingReqId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<number | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const handleLock = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.lockRequest(req.id);
      if (res.success) {
        onToast('Đã nhận xử lý yêu cầu (Khóa CAS 5 phút)');
        onRefresh();
      } else {
        onToast(res.message || 'Không thể khóa yêu cầu', true);
      }
    } catch (err: any) {
      onToast(err.message || 'Lỗi khi khóa yêu cầu', true);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleUnlock = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.unlockRequest(req.id);
      if (res.success) {
        onToast('Đã mở khóa yêu cầu');
        onRefresh();
      } else {
        onToast(res.message || 'Không thể mở khóa', true);
      }
    } catch (err: any) {
      onToast(err.message || 'Lỗi khi mở khóa', true);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleEscalate = async (req: AllocationRequestItem) => {
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.forwardRequest(req.id, 'Chuyển tiếp lên cấp trên xét duyệt vì vượt quá hạn mức đơn vị');
      if (res.success) {
        onToast('Đã leo thang (chuyển tiếp) yêu cầu lên cấp trên thành công');
        onRefresh();
      } else {
        onToast(res.message || 'Không thể chuyển tiếp yêu cầu', true);
      }
    } catch (err: any) {
      onToast(err.message || 'Lỗi khi leo thang yêu cầu', true);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReqId || !rejectReason.trim()) return;

    try {
      setIsRejecting(true);
      const res = await allocationRequestApi.rejectRequest(rejectingReqId, rejectReason.trim());
      if (res.success) {
        onToast('Đã từ chối yêu cầu thành công');
        setRejectingReqId(null);
        setRejectReason('');
        onRefresh();
      } else {
        onToast(res.message || 'Lỗi khi từ chối yêu cầu', true);
      }
    } catch (err: any) {
      onToast(err.message || 'Lỗi hệ thống khi từ chối yêu cầu', true);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancel = async (req: AllocationRequestItem) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu xin ngân sách này không?')) return;
    try {
      setLoadingActionId(req.id);
      const res = await allocationRequestApi.cancelRequest(req.id);
      if (res.success) {
        onToast('Đã hủy yêu cầu xin ngân sách');
        onRefresh();
      } else {
        onToast(res.message || 'Không thể hủy yêu cầu', true);
      }
    } catch (err: any) {
      onToast(err.message || 'Lỗi khi hủy yêu cầu', true);
    } finally {
      setLoadingActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Filter & Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {['ALL', 'PENDING', 'ALLOCATING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'PENDING' && 'Chờ duyệt'}
              {st === 'ALLOCATING' && 'Đang xử lý (Khóa)'}
              {st === 'APPROVED' && 'Đã giải ngân'}
              {st === 'REJECTED' && 'Bị từ chối'}
            </button>
          ))}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenCreateRequestModal}
          className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Xin cấp ngân sách</span>
        </button>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Send className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Không có yêu cầu ngân sách nào</p>
          <p className="text-xs text-zinc-400 mt-1">Các yêu cầu từ các nhóm con cấp dưới sẽ xuất hiện tại đây để duyệt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const reqAmount = Number(req.amount) || 0;
            const isLocked = req.status === 'ALLOCATING';
            const isLocker = isLocked && currentUserId && req.lockedByUserId === currentUserId;
            const isRequester = currentUserId && req.requesterUserId === currentUserId;
            const isLoading = loadingActionId === req.id;

            return (
              <div
                key={req.id}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Column: Details */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {req.destinationUnit?.name || `Đơn vị #${req.destinationUnitId}`}
                    </span>
                    <span className="text-xs text-zinc-400">xin thêm</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                      {formatVND(reqAmount)}
                    </span>

                    {/* Status Badge */}
                    {req.status === 'PENDING' && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Chờ duyệt
                      </span>
                    )}
                    {req.status === 'ALLOCATING' && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 rounded-lg border border-orange-200 dark:border-orange-800/50 flex items-center gap-1 animate-pulse">
                        <Lock className="w-3 h-3" />
                        Đang khóa bởi: {req.lockedByUser?.name || 'Quản trị viên'}
                      </span>
                    )}
                    {req.status === 'APPROVED' && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã giải ngân ({req.fundedByUnit?.name || 'Cấp trên'})
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Bị từ chối
                      </span>
                    )}
                    {req.status === 'CANCELLED' && (
                      <span className="px-2.5 py-0.5 text-xs font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded-lg">
                        Đã hủy
                      </span>
                    )}
                  </div>

                  {/* Reason & Meta */}
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    <span className="text-zinc-400 font-medium">Lý do: </span>
                    {req.reason}
                  </p>

                  {req.rejectionReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/40">
                      <strong>Lý do từ chối:</strong> {req.rejectionReason}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>Người nộp: {req.requesterUser?.name || req.requesterUser?.email}</span>
                    <span>•</span>
                    <span>Ngày tạo: {new Date(req.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Right Column: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleLock(req)}
                        disabled={isLoading}
                        className="h-9 px-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Khóa để xử lý</span>
                      </button>

                      {isRequester && (
                        <button
                          onClick={() => handleCancel(req)}
                          disabled={isLoading}
                          className="h-9 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-medium transition-colors"
                        >
                          Hủy đơn
                        </button>
                      )}
                    </>
                  )}

                  {req.status === 'ALLOCATING' && (
                    <>
                      {/* Duyệt & Rót tiền (CONFIRM challenge) */}
                      <button
                        onClick={() => onOpenFundModal(req)}
                        className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt & Giải ngân</span>
                      </button>

                      {/* Leo thang cấp trên (Escalate) */}
                      <button
                        onClick={() => handleEscalate(req)}
                        disabled={isLoading}
                        title="Chuyển tiếp lên đơn vị cấp trên (Grandparent)"
                        className="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200 dark:border-indigo-800/40"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Leo thang</span>
                      </button>

                      {/* Từ chối */}
                      <button
                        onClick={() => {
                          setRejectingReqId(req.id);
                          setRejectReason('');
                        }}
                        disabled={isLoading}
                        className="h-9 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-200 dark:border-red-800/40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>

                      {/* Mở khóa */}
                      <button
                        onClick={() => handleUnlock(req)}
                        disabled={isLoading}
                        title="Hủy khóa để người khác hoặc bạn xử lý sau"
                        className="h-9 px-2.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl text-xs transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800/50">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Từ chối yêu cầu ngân sách
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Lý do từ chối sẽ được lưu vào lịch sử đối soát kiểm toán
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Đơn vị chưa có dự toán chi tiết, vượt hạn mức chi..."
                  required
                  className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setRejectingReqId(null)}
                  className="h-10 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-colors shadow-xs"
                >
                  {isRejecting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
