'use client';

import React, { useState } from 'react';
import { ShieldCheck, Clock, ShieldAlert, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Expense } from '../types/expense';
import { formatVND } from '../lib/format';

interface ExpenseTableProps {
  expenses: Expense[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onViewAll?: () => void;
  onApprove?: (id: string) => Promise<any> | void;
  onReject?: (id: string, reason: string) => Promise<any> | void;
  onPay?: (id: string) => Promise<any> | void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isPaying?: boolean;
  currentUserId?: number;
  currentUserRole?: string;
}

type OrderStatusFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED';

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  searchQuery,
  onSearchChange,
  onApprove,
  onReject,
  onPay,
  isApproving,
  isRejecting,
  isPaying,
  currentUserId,
  currentUserRole,
}) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [internalQuery, setInternalQuery] = useState('');

  // Rejection modal state
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const activeQuery = searchQuery !== undefined ? searchQuery : internalQuery;
  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  // Chuẩn hóa status PENDING/SUBMITTED
  const normalizeStatus = (status: string) => {
    if (status === 'PENDING' || status === 'SUBMITTED') return 'SUBMITTED';
    return status;
  };

  // Đếm số lượng theo trạng thái
  const submittedCount = expenses.filter((e) => normalizeStatus(e.approvalStatus) === 'SUBMITTED').length;
  const approvedCount = expenses.filter((e) => e.approvalStatus === 'APPROVED').length;
  const paidCount = expenses.filter((e) => e.approvalStatus === 'PAID').length;
  const rejectedCount = expenses.filter((e) => e.approvalStatus === 'REJECTED').length;

  // Lọc kết hợp giữa Trạng thái đơn và Từ khóa tìm kiếm
  const filteredExpenses = expenses.filter((exp) => {
    const norm = normalizeStatus(exp.approvalStatus);
    const matchStatus = statusFilter === 'ALL' || norm === statusFilter;
    const query = activeQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      exp.user.toLowerCase().includes(query) ||
      exp.purpose.toLowerCase().includes(query) ||
      exp.id.toLowerCase().includes(query) ||
      exp.category.toLowerCase().includes(query) ||
      (exp.unitName && exp.unitName.toLowerCase().includes(query));

    return matchStatus && matchQuery;
  });

  const handleOpenReject = (id: string) => {
    setRejectingExpenseId(id);
    setRejectionReason('');
    setRejectionError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('Vui lòng nhập lý do từ chối giao dịch (bắt buộc).');
      return;
    }
    try {
      if (onReject && rejectingExpenseId) {
        await onReject(rejectingExpenseId, rejectionReason.trim());
      }
      setRejectingExpenseId(null);
      setRejectionReason('');
      setRejectionError(null);
    } catch (err: any) {
      setRejectionError(err?.message || 'Có lỗi xảy ra khi từ chối giao dịch');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      if (onApprove) {
        await onApprove(id);
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi duyệt chi tiêu');
    }
  };

  const handlePay = async (id: string) => {
    try {
      if (onPay) {
        await onPay(id);
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi hoàn ứng chi tiêu');
    }
  };

  return (
    <div className="nv-card flex flex-col">
      {/* Header bảng + Tìm kiếm + Bộ lọc trạng thái đơn */}
      <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Sổ cái chi tiêu & Phê duyệt</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Phê duyệt trực tiếp bởi Quản lý đơn vị • Không thể xóa để bảo toàn kiểm toán
            </p>
          </div>

          {/* Ô tìm kiếm giao dịch */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text" 
              placeholder="Tìm mã GD, người chi, đơn vị..."
              value={activeQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-zinc-400 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Cụm bộ lọc trạng thái đơn */}
        <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800/80 text-xs flex-nowrap whitespace-nowrap">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({expenses.length})
            </button>
            <button 
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'SUBMITTED' 
                  ? 'bg-white dark:bg-zinc-700 text-amber-700 dark:text-amber-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Chờ duyệt ({submittedCount})
            </button>
            <button 
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'APPROVED' 
                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Đã duyệt ({approvedCount})
            </button>
            <button 
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'PAID' 
                  ? 'bg-white dark:bg-zinc-700 text-purple-700 dark:text-purple-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Đã hoàn ứng ({paidCount})
            </button>
            <button 
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === 'REJECTED' 
                  ? 'bg-white dark:bg-zinc-700 text-red-700 dark:text-red-400 shadow-sm font-semibold' 
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Từ chối ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Table view (Desktop & Tablet >= 640px) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50/70 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200/80 dark:border-zinc-800">
            <tr>
              <th className="px-3 py-2.5">Mã GD & Mục đích</th>
              <th className="px-3 py-2.5">Người chi / Đơn vị</th>
              <th className="px-2.5 py-2.5 whitespace-nowrap">Ngày</th>
              <th className="px-2.5 py-2.5 text-right whitespace-nowrap">Số tiền</th>
              <th className="px-2.5 py-2.5 text-center whitespace-nowrap">Trạng thái</th>
              <th className="px-3 py-2.5 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-400">
                  <p className="font-medium text-zinc-600 dark:text-zinc-300 mb-1">Không tìm thấy khoản chi tiêu nào</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {searchQuery ? `Không có hóa đơn nào khớp với từ khóa "${searchQuery}"` : 'Không có hóa đơn nào theo trạng thái đã chọn'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => {
                const normStatus = normalizeStatus(exp.approvalStatus);

                return (
                  <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors group">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-zinc-900 dark:text-white truncate max-w-[180px]" title={exp.purpose}>
                          {exp.purpose}
                        </p>
                        {exp.scanStatus === 'CLEAN' && (
                          <span title="Tệp đã quét sạch mã độc" className="text-emerald-500 shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {exp.scanStatus === 'INFECTED' && (
                          <span title="Cảnh báo: Phát hiện mã độc" className="text-red-500 shrink-0">
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{exp.id}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-medium">{exp.category}</span>
                        {exp.taxCode && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800" title={exp.vendorName || 'Đã đối chiếu Cổng Đăng ký KD'}>
                              MST: {exp.taxCode}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Người nộp đơn & Đơn vị lá */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center shrink-0">
                          {exp.user.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 block truncate max-w-[120px]">{exp.user}</span>
                          {exp.unitName && (
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block truncate max-w-[120px]">{exp.unitName}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-2.5 py-2.5 text-zinc-600 dark:text-zinc-400 text-xs font-mono whitespace-nowrap">{exp.date}</td>
                    
                    <td className="px-2.5 py-2.5 text-right font-semibold text-zinc-900 dark:text-white font-mono whitespace-nowrap">
                      {formatVND(exp.amount)}
                    </td>

                    {/* Approval Status Badge */}
                    <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                      {normStatus === 'APPROVED' && (
                        <span className="nv-badge-success inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã duyệt
                        </span>
                      )}
                      {normStatus === 'PAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã hoàn ứng
                        </span>
                      )}
                      {normStatus === 'SUBMITTED' && (
                        <span className="nv-badge-warning inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ duyệt
                        </span>
                      )}
                      {normStatus === 'REJECTED' && (
                        <div className="flex flex-col items-center">
                          <span className="nv-badge-danger inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Từ chối
                          </span>
                          {exp.rejectionReason && (
                            <span className="text-[10px] text-red-500 mt-0.5 max-w-[110px] truncate" title={exp.rejectionReason}>
                              {exp.rejectionReason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Thao tác Duyệt / Từ chối / Hoàn ứng */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {normStatus === 'SUBMITTED' ? (
                        currentUserId && exp.userId === currentUserId && currentUserRole !== 'ROOT' ? (
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            Chờ cấp trên duyệt
                          </span>
                        ) : onApprove && onReject ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(exp.id)}
                              disabled={isApproving}
                              title="Phê duyệt chi tiêu"
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleOpenReject(exp.id)}
                              disabled={isRejecting}
                              title="Từ chối chi tiêu"
                              className="px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">—</span>
                        )
                      ) : normStatus === 'APPROVED' && onPay ? (
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handlePay(exp.id)}
                            disabled={isPaying}
                            title="Xác nhận hoàn ứng / đã chi trả tiền cho nhân viên"
                            className="px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isPaying ? 'Đang lưu...' : 'Hoàn ứng'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View (< 640px) */}
      <div className="block sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {filteredExpenses.length === 0 ? (
          <div className="p-6 text-center text-zinc-400">
            <p className="font-medium text-zinc-600 dark:text-zinc-300 mb-1">Không tìm thấy khoản chi tiêu nào</p>
            <p className="text-xs text-zinc-400">Thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const normStatus = normalizeStatus(exp.approvalStatus);

            return (
              <div key={exp.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                      {exp.purpose}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400 font-mono">
                      <span>{exp.id}</span>
                      <span>•</span>
                      <span className="text-zinc-600 dark:text-zinc-300">{exp.category}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white font-mono block">
                      {formatVND(exp.amount)}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">{exp.date}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px] font-bold flex items-center justify-center">
                      {exp.user.charAt(0)}
                    </div>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{exp.user}</span>
                    {exp.unitName && (
                      <span className="text-zinc-400 text-[11px]">({exp.unitName})</span>
                    )}
                  </div>

                    <div>
                    {normStatus === 'APPROVED' && (
                      <span className="nv-badge-success text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                      </span>
                    )}
                    {normStatus === 'PAID' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        <CheckCircle2 className="w-3 h-3" /> Đã hoàn ứng
                      </span>
                    )}
                    {normStatus === 'SUBMITTED' && (
                      <span className="nv-badge-warning text-[11px] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Chờ duyệt
                      </span>
                    )}
                    {normStatus === 'REJECTED' && (
                      <span className="nv-badge-danger text-[11px] inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Từ chối
                      </span>
                    )}
                  </div>
                </div>

                {normStatus === 'REJECTED' && exp.rejectionReason && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
                    <strong>Lý do từ chối:</strong> {exp.rejectionReason}
                  </div>
                )}

                {/* Mobile action buttons */}
                {normStatus === 'SUBMITTED' && (
                  currentUserId && exp.userId === currentUserId && currentUserRole !== 'ROOT' ? (
                    <div className="text-center py-1.5 px-3 text-xs text-zinc-400 dark:text-zinc-500 italic bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
                      Giao dịch của bạn • Chờ cấp trên phê duyệt
                    </div>
                  ) : onApprove && onReject ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(exp.id)}
                        disabled={isApproving}
                        className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt chi</span>
                      </button>
                      <button
                        onClick={() => handleOpenReject(exp.id)}
                        disabled={isRejecting}
                        className="w-full py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  ) : null
                )}

                {normStatus === 'APPROVED' && onPay && (
                  <div className="pt-1">
                    <button
                      onClick={() => handlePay(exp.id)}
                      disabled={isPaying}
                      className="w-full py-2 px-3 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isPaying ? 'Đang xử lý...' : 'Xác nhận hoàn ứng (PAID)'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nhập lý do từ chối giao dịch */}
      {rejectingExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Từ chối khoản chi tiêu</h3>
                <p className="text-xs text-zinc-500">Mã giao dịch: {rejectingExpenseId}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed">
              Theo quy chuẩn kế toán và kiểm toán nội bộ, bạn bắt buộc phải cung cấp lý do từ chối để nhân viên biết nguyên nhân. Giao dịch sẽ không bị xóa khỏi sổ cái.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Thiếu hóa đơn VAT hợp lệ, chi sai định mức quy định..."
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectionError) setRejectionError(null);
                }}
                className="w-full text-xs sm:text-sm p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              {rejectionError && (
                <p className="text-xs text-red-500 mt-1.5">{rejectionError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingExpenseId(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
