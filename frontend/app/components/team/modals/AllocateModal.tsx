'use client';

import React, { useState } from 'react';
import { ArrowRight, Coins, AlertTriangle, X, Wallet } from 'lucide-react';
import { formatVND } from '../../../lib/format';
import { Unit } from '../../../types/expense';
import { allocationApi } from '../../../apis/allocationApi';

interface AllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  sourceUnit: Unit | null;
  targetUnits: Unit[];
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceUnit,
  targetUnits,
}) => {
  const [targetUnitId, setTargetUnitId] = useState<number | undefined>(undefined);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSafeBalance = sourceUnit ? (Number(sourceUnit.safeBalance) || 0) : Infinity;

  // Lọc bỏ chính đơn vị nguồn
  const availableTargetUnits = targetUnits.filter((u) => !sourceUnit || u.id !== sourceUnit.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền cấp phát lớn hơn 0 VND');
      return;
    }

    if (sourceUnit && numAmount > currentSafeBalance) {
      setErrorMsg(`Số tiền cấp (${formatVND(numAmount)}) vượt quá số dư an toàn của đơn vị nguồn (${formatVND(currentSafeBalance)}).`);
      return;
    }

    if (!targetUnitId) {
      setErrorMsg('Vui lòng chọn đơn vị thụ hưởng nhận tiền');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await allocationApi.createAllocation({
        sourceUnitId: sourceUnit ? sourceUnit.id : null,
        targetUnitId,
        amount: numAmount,
        note: note.trim() || undefined,
      });

      if (res.success) {
        onSuccess(res.message || `Đã cấp thành công ${formatVND(numAmount)}`);
        onClose();
        setAmount('');
        setNote('');
        setTargetUnitId(undefined);
      } else {
        setErrorMsg(res.message || 'Lỗi khi cấp ngân sách');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi cấp ngân sách');
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
                {sourceUnit ? `Rót ngân sách từ ${sourceUnit.name}` : 'Nạp vốn ban đầu (ROOT)'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {sourceUnit ? 'Trích tiền từ két nguồn cấp xuống đơn vị nhận' : 'Cấp vốn gốc công ty vào quỹ phòng ban'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source balance info */}
          {sourceUnit && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Số dư an toàn nguồn:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {formatVND(currentSafeBalance)}
              </span>
            </div>
          )}

          {/* Target Unit Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Đơn vị nhận ngân sách <span className="text-red-500">*</span>
            </label>
            <select
              value={targetUnitId || ''}
              onChange={(e) => setTargetUnitId(Number(e.target.value) || undefined)}
              required
              className="w-full h-11 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="">-- Chọn đơn vị nhận tiền --</option>
              {availableTargetUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (Chủ sở hữu: {u.owner?.name || u.owner?.email || 'Chưa gán'})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Số tiền cấp phát (VND) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 100000000"
              required
              className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            {amount && !isNaN(Number(amount)) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Bằng chữ: <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatVND(Number(amount))}</span>
              </p>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Ghi chú cấp phát (Tùy chọn)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Cấp ngân sách phát triển Q4"
              className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
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
              disabled={isSubmitting || !amount || Number(amount) <= 0 || !targetUnitId}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <Coins className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang cấp...' : 'Xác nhận cấp phát'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
