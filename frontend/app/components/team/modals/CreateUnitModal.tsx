'use client';

import React, { useState } from 'react';
import { GitFork, AlertTriangle, X, Building2 } from 'lucide-react';
import { Unit, EmployeeUser } from '../../../types/expense';
import { unitApi } from '../../../apis/unitApi';

interface CreateUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  parentUnit: Unit | null;
  employees: EmployeeUser[];
}

export const CreateUnitModal: React.FC<CreateUnitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  parentUnit,
  employees,
}) => {
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState<number | undefined>(undefined);
  const [allowCreateSubUnit, setAllowCreateSubUnit] = useState(false);
  const [allowMemberViewBalance, setAllowMemberViewBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên đơn vị mới');
      return;
    }

    if (!ownerId) {
      setErrorMsg('Vui lòng chỉ định người quản lý (Owner) cho đơn vị này');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await unitApi.createUnit({
        name: name.trim(),
        parentId: parentUnit ? parentUnit.id : null,
        ownerId,
        allowCreateSubUnit,
        allowMemberViewBalance,
      });

      if (res.success) {
        onSuccess(res.message || `Đã tạo đơn vị "${name}" thành công`);
        onClose();
        setName('');
        setOwnerId(undefined);
        setAllowCreateSubUnit(false);
        setAllowMemberViewBalance(false);
      } else {
        setErrorMsg(res.message || 'Lỗi khi tạo đơn vị');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi tạo đơn vị');
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
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {parentUnit ? `Tạo nhánh con trực thuộc ${parentUnit.name}` : 'Tạo đơn vị mới'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Mở rộng cơ cấu tổ chức phân tầng doanh nghiệp
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

          {/* Unit Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tên đơn vị / Nhóm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nhóm DevOps, Ban Công Nghệ, Khối Kinh Doanh..."
              required
              className="w-full h-11 px-3.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Owner Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Người phụ trách (Owner / Trưởng nhóm) <span className="text-red-500">*</span>
            </label>
            <select
              value={ownerId || ''}
              onChange={(e) => setOwnerId(Number(e.target.value) || undefined)}
              required
              className="w-full h-11 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="">-- Chọn nhân viên làm Trưởng nhóm --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || 'Không tên'} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          {/* Flags */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCreateSubUnit}
                onChange={(e) => setAllowCreateSubUnit(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300 dark:border-zinc-600"
              />
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">
                  Cho phép tạo nhánh con (Nest)
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ủy quyền cho người quản lý nhóm này tự đẻ thêm các nhóm nhỏ hơn bên dưới
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowMemberViewBalance}
                onChange={(e) => setAllowMemberViewBalance(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300 dark:border-zinc-600"
              />
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">
                  Cho phép thành viên xem số dư quỹ
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Thành viên (VIEWER) trong nhóm có thể thấy số dư an toàn của nhóm
                </span>
              </div>
            </label>
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
              disabled={isSubmitting || !name.trim() || !ownerId}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <GitFork className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
