'use client';

import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { formatVND } from '../../../lib/format';
import { Unit } from '../../../types/expense';
import { allocationApi } from '../../../apis/allocationApi';

interface RecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  sourceUnit: Unit | null; // Đơn vị con bị thu hồi tiền
  targetParentUnit?: Unit | null; // Đơn vị cha tiếp nhận tiền
}

export const RecallModal: React.FC<RecallModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceUnit,
  targetParentUnit,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !sourceUnit) return null;

  const currentSafeBalance = Number(sourceUnit.safeBalance) || 0;
  const targetParentId = targetParentUnit?.id || sourceUnit.parentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thu hồi lớn hơn 0 VND');
      return;
    }

    if (numAmount > currentSafeBalance) {
      setErrorMsg(`Số tiền thu hồi (${formatVND(numAmount)}) vượt quá số dư an toàn hiện có (${formatVND(currentSafeBalance)}) của đơn vị con.`);
      return;
    }

    if (!targetParentId) {
      setErrorMsg('Đơn vị này không có đơn vị cấp trên (Parent) để thu hồi tiền về.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationApi.recallAllocation({
        sourceUnitId: sourceUnit.id,
        targetUnitId: targetParentId,
        amount: numAmount,
        reason: reason.trim() || 'Thu hồi điều chỉnh ngân sách phòng ban',
      });

      if (res.success) {
        onSuccess(res.message || `Đã thu hồi thành công ${formatVND(numAmount)} từ ${sourceUnit.name}`);
        onClose();
        setAmount('');
        setReason('');
      } else {
        setErrorMsg(res.message || 'Lỗi khi thực hiện thu hồi');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi thu hồi ngân sách');
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
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Thu hồi ngân sách
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Kéo ngân sách thừa từ đơn vị con rút ngược về đơn vị cha
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

          {/* Source and Target Units display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Đơn vị bị thu hồi (Con):</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">{sourceUnit.name}</p>
              <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                Số dư hiện có: <span className="font-semibold">{formatVND(currentSafeBalance)}</span>
              </p>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Đơn vị nhận lại (Cha):</span>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {targetParentUnit?.name || sourceUnit.parent?.name || 'Đơn vị Cha cấp trên'}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Số tiền thu hồi (VND) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="1000"
                max={currentSafeBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ví dụ: 10000000"
                required
                className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <button
                type="button"
                onClick={() => setAmount(currentSafeBalance.toString())}
                className="absolute right-2.5 top-2.5 text-xs font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                Tối đa
              </button>
            </div>
            {amount && !isNaN(Number(amount)) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Bằng chữ: <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatVND(Number(amount))}</span>
              </p>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Lý do thu hồi ngân sách <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do thu hồi để phục vụ đối soát kiểm toán..."
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
              disabled={isSubmitting || !amount || Number(amount) <= 0 || Number(amount) > currentSafeBalance}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
