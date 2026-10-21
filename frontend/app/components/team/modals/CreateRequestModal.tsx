'use client';

import React, { useState } from 'react';
import { Send, AlertTriangle, X, DollarSign } from 'lucide-react';
import { formatVND } from '../../../lib/format';
import { Unit } from '../../../types/expense';
import { allocationRequestApi } from '../../../apis/allocationRequestApi';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  units: Unit[];
  defaultUnitId?: number;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  units,
  defaultUnitId,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<number | undefined>(defaultUnitId || (units[0]?.id));
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validUnits = units.filter((u) => u.parentId !== null); // Đơn vị gốc không có cha thì không được xin

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền xin cấp phát lớn hơn 0 VND');
      return;
    }

    if (!selectedUnitId) {
      setErrorMsg('Vui lòng chọn đơn vị cần xin ngân sách');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Vui lòng cung cấp lý do xin thêm ngân sách');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationRequestApi.createRequest({
        destinationUnitId: selectedUnitId,
        amount: numAmount,
        reason: reason.trim(),
      });

      if (res.success) {
        onSuccess(res.message || `Đã gửi yêu cầu xin ${formatVND(numAmount)} lên cấp trên thành công`);
        onClose();
        setAmount('');
        setReason('');
      } else {
        setErrorMsg(res.message || 'Lỗi khi tạo yêu cầu xin ngân sách');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi gửi yêu cầu');
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Xin cấp thêm ngân sách
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gửi yêu cầu lên đơn vị Cha trực tiếp để xét duyệt và rót vốn
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

          {/* Unit selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Đơn vị nhận ngân sách <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(Number(e.target.value))}
              required
              className="w-full h-11 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              {validUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (Trực thuộc: {u.parent?.name || 'Cấp trên'})
                </option>
              ))}
            </select>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Số tiền cần xin (VND) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 50000000"
              required
              className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            {amount && !isNaN(Number(amount)) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Bằng chữ: <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatVND(Number(amount))}</span>
              </p>
            )}
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Lý do xin ngân sách <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nêu rõ mục đích chi tiêu (dự án mới, phát sinh máy chủ, chiến dịch marketing...)"
              required
              className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none"
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
              disabled={isSubmitting || !amount || Number(amount) <= 0 || !reason.trim()}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
