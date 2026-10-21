'use client';

import React, { useState } from 'react';
import { Coins, CheckCircle2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { formatVND } from '../../../lib/format';
import { AllocationRequestItem, allocationRequestApi } from '../../../apis/allocationRequestApi';

interface FundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  request: AllocationRequestItem | null;
}

export const FundRequestModal: React.FC<FundRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  request,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const isConfirmed = confirmationInput.trim() === 'CONFIRM';
  const requestAmount = Number(request.amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isConfirmed) {
      setErrorMsg('Vui lòng nhập chính xác chữ "CONFIRM" để xác nhận giải ngân an toàn');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationRequestApi.approveAndFundRequest(request.id, {
        confirmation: 'CONFIRM',
        note: note.trim() || undefined,
      });

      if (res.success) {
        onSuccess(res.message || `Đã giải ngân thành công ${formatVND(requestAmount)} cho ${request.destinationUnit?.name}`);
        onClose();
        setConfirmationInput('');
        setNote('');
      } else {
        setErrorMsg(res.message || 'Lỗi khi giải ngân yêu cầu');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi phê duyệt giải ngân');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Xác nhận Phê duyệt & Giải ngân
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Xuất tiền từ két đơn vị cấp trên rót xuống đơn vị xin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Info card */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 dark:text-zinc-500">Đơn vị thụ hưởng:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{request.destinationUnit?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 dark:text-zinc-500">Người nộp đơn:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {request.requesterUser?.name || request.requesterUser?.email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 dark:text-zinc-500">Số tiền giải ngân:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatVND(requestAmount)}
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
              <span className="text-zinc-400 dark:text-zinc-500 block mb-0.5">Lý do xin ngân sách:</span>
              <p className="text-zinc-700 dark:text-zinc-300 italic">{request.reason}</p>
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ghi chú phê duyệt (Tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Đã xem xét báo cáo quý, duyệt cấp đủ hạn mức"
              className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Safety Challenge Requirement */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-semibold mb-1">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Cơ chế bảo vệ thất thoát tài chính</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed mb-2.5">
              Để tránh bấm nhầm chuyển tiền, hệ thống yêu cầu bạn gõ chính xác chữ <strong className="font-mono bg-amber-200/60 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200">CONFIRM</strong> vào ô bên dưới:
            </p>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Gõ CONFIRM vào đây"
              className="w-full h-10 px-3 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700/60 rounded-lg text-sm font-mono font-semibold tracking-wider text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isConfirmed}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <CheckCircle2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang giải ngân...' : 'Xác nhận & Cấp tiền'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
