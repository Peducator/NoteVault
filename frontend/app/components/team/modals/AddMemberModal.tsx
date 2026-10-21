'use client';

import React, { useState } from 'react';
import { UserPlus, AlertTriangle, X, Shield, Users } from 'lucide-react';
import { Unit, EmployeeUser } from '../../../types/expense';
import { unitApi } from '../../../apis/unitApi';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  unit: Unit | null;
  employees: EmployeeUser[];
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  unit,
  employees,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [role, setRole] = useState<'EDIT' | 'VIEWER'>('VIEWER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !unit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedUserId) {
      setErrorMsg('Vui lòng chọn nhân viên cần thêm vào đơn vị');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await unitApi.addMember(unit.id, selectedUserId, role);

      if (res.success) {
        const roleLabel = role === 'EDIT' ? 'Đồng quản lý (EDIT)' : 'Thành viên (VIEWER)';
        onSuccess(res.message || `Đã thêm nhân viên vào ${unit.name} với quyền ${roleLabel}`);
        onClose();
        setSelectedUserId(undefined);
        setRole('VIEWER');
      } else {
        setErrorMsg(res.message || 'Lỗi khi thêm nhân viên');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi gán nhân viên');
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
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800/50">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Thêm thành viên vào {unit.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Chỉ định nhân viên và thiết lập vai trò tác nghiệp trong đơn vị
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

          {/* Select Employee */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Chọn nhân viên <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value) || undefined)}
              required
              className="w-full h-11 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="">-- Chọn nhân viên trong công ty --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name || 'Không tên'} ({emp.email}) - Hiện tại: {emp.unit?.name || 'Tự do'}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection (EDIT vs VIEWER) */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Vai trò trong đơn vị <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('VIEWER')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'VIEWER'
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/70 ring-1 ring-zinc-900 dark:ring-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">VIEWER (Thành viên)</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                  Chỉ được xem thông tin, không được duyệt chi hay rót ngân sách.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('EDIT')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  role === 'EDIT'
                    ? 'border-purple-600 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-950/30 ring-1 ring-purple-600 dark:ring-purple-400'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">EDIT (Đồng quản lý)</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                  Quyền Phó ban / subCTO: Phụ tá điều hành, duyệt chi, cấp tiền và xử lý đơn xin quỹ.
                </p>
              </button>
            </div>
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
              disabled={isSubmitting || !selectedUserId}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs flex items-center gap-2"
            >
              <UserPlus className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Đang thêm...' : 'Xác nhận thêm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
